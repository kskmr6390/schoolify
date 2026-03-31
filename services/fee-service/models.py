"""Fee service models with idempotency support."""
import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (Boolean, Column, Date, DateTime, Enum, ForeignKey,
                        Integer, Numeric, String, Text, UniqueConstraint)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from ..shared.database import Base, TenantAwareModel


class FeeType(str, enum.Enum):
    TUITION = "tuition"
    TRANSPORT = "transport"
    LIBRARY = "library"
    LAB = "lab"
    SPORTS = "sports"
    EXAM = "exam"
    OTHER = "other"


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CHEQUE = "cheque"
    ONLINE = "online"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class FeeStructure(TenantAwareModel):
    """Defines the fee components for a class/academic year."""
    __tablename__ = "fee_structures"

    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    class_id = Column(UUID(as_uuid=True), nullable=True)  # Null = applies to all classes
    name = Column(String(255), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Date, nullable=False)
    fee_type = Column(Enum(FeeType), nullable=False, default=FeeType.TUITION)
    is_recurring = Column(Boolean, default=False)
    recurrence = Column(String(20), nullable=True)  # monthly/quarterly/annual
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)


class Invoice(TenantAwareModel):
    """
    Student fee invoice.
    idempotency_key prevents duplicate invoice creation on retry.
    invoice_number is human-readable: INV-2024-00001
    """
    __tablename__ = "invoices"
    __table_args__ = (UniqueConstraint("tenant_id", "invoice_number"),)

    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    invoice_number = Column(String(50), nullable=False)   # INV-YYYY-NNNNN
    total_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), default=0)
    discount_amount = Column(Numeric(10, 2), default=0)
    late_fee = Column(Numeric(10, 2), default=0)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.PENDING, nullable=False)
    issued_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    notes = Column(Text, nullable=True)
    idempotency_key = Column(String(255), unique=True, nullable=True)  # Client-supplied

    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice")

    @property
    def balance_due(self):
        return self.total_amount + self.late_fee - self.discount_amount - self.paid_amount


class InvoiceItem(Base):
    """Line items within an invoice."""
    __tablename__ = "invoice_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    fee_structure_id = Column(UUID(as_uuid=True), nullable=True)
    description = Column(String(255), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, default=1)

    invoice = relationship("Invoice", back_populates="items")


class ReceiptGenerationStatus(str, enum.Enum):
    PENDING = "pending"
    GENERATING = "generating"
    DONE = "done"
    FAILED = "failed"


class FeeReceipt(TenantAwareModel):
    """
    Generated fee receipt — can cover one invoice or multiple (clubbed).
    Supports soft-delete so admin can delete and regenerate.
    pdf_url points to S3 object; email_sent tracks delivery.
    """
    __tablename__ = "fee_receipts"

    receipt_number = Column(String(50), nullable=False)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    invoice_ids = Column(JSONB, nullable=False)           # list of invoice UUIDs covered
    template = Column(String(20), nullable=False, default="classic")  # classic/modern/minimal
    is_clubbed = Column(Boolean, default=False)           # True when multiple invoices merged
    total_amount = Column(Numeric(10, 2), nullable=False)
    paid_amount = Column(Numeric(10, 2), nullable=False, default=0)
    notes = Column(Text, nullable=True)
    generated_by = Column(UUID(as_uuid=True), nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    # PDF + delivery
    pdf_url = Column(String(1024), nullable=True)         # S3 signed / public URL
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    generation_status = Column(
        Enum(ReceiptGenerationStatus),
        default=ReceiptGenerationStatus.PENDING,
        nullable=False,
    )
    generation_error = Column(Text, nullable=True)


class BulkReceiptJob(TenantAwareModel):
    """Tracks progress of a bulk receipt generation run."""
    __tablename__ = "bulk_receipt_jobs"

    created_by = Column(UUID(as_uuid=True), nullable=False)
    total = Column(Integer, default=0)
    completed = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    status = Column(String(20), default="pending")        # pending|running|done|failed
    template = Column(String(20), default="classic")
    send_email = Column(Boolean, default=True)
    error_log = Column(JSONB, default=list)               # [{student_id, error}]


class Payment(TenantAwareModel):
    """
    Payment record with idempotency.
    idempotency_key (from client) ensures payment is processed exactly once
    even if the client retries the request.
    """
    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("idempotency_key"),)

    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    transaction_id = Column(String(255), nullable=True)   # Gateway transaction ID
    idempotency_key = Column(String(255), nullable=False, unique=True)  # Required
    gateway_response = Column(JSONB, nullable=True)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.COMPLETED)
    paid_at = Column(DateTime, nullable=True)
    recorded_by = Column(UUID(as_uuid=True), nullable=True)
    refund_reason = Column(Text, nullable=True)

    invoice = relationship("Invoice", back_populates="payments")
