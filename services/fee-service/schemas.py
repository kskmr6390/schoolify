"""Fee service schemas."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FeeStructureCreate(BaseModel):
    academic_year_id: UUID
    class_id: Optional[UUID] = None
    name: str
    amount: Decimal = Field(gt=0)
    due_date: date
    fee_type: str = "tuition"
    is_recurring: bool = False
    recurrence: Optional[str] = None
    description: Optional[str] = None


class FeeStructureResponse(BaseModel):
    id: UUID
    academic_year_id: UUID
    class_id: Optional[UUID]
    name: str
    amount: Decimal
    due_date: date
    fee_type: str
    is_recurring: bool
    model_config = {"from_attributes": True}


class InvoiceItemInput(BaseModel):
    fee_structure_id: Optional[UUID] = None
    description: str
    amount: Decimal
    quantity: int = 1


class CreateInvoiceRequest(BaseModel):
    student_id: UUID
    academic_year_id: UUID
    items: List[InvoiceItemInput]
    due_date: date
    notes: Optional[str] = None
    idempotency_key: Optional[str] = None  # Client-supplied for deduplication


class InvoiceItemResponse(BaseModel):
    id: UUID
    description: str
    amount: Decimal
    quantity: int
    model_config = {"from_attributes": True}


class InvoiceResponse(BaseModel):
    id: UUID
    student_id: UUID
    invoice_number: str
    total_amount: Decimal
    paid_amount: Optional[Decimal] = Decimal("0")
    discount_amount: Optional[Decimal] = Decimal("0")
    late_fee: Optional[Decimal] = Decimal("0")
    status: str
    issued_date: date
    due_date: date
    notes: Optional[str] = None
    items: List[InvoiceItemResponse] = []
    model_config = {"from_attributes": True}


class RecordPaymentRequest(BaseModel):
    invoice_id: UUID
    amount: Decimal = Field(gt=0)
    payment_method: str
    transaction_id: Optional[str] = None
    idempotency_key: str = Field(min_length=1, description="Unique key to prevent duplicate payments")


class PaymentResponse(BaseModel):
    id: UUID
    invoice_id: UUID
    student_id: UUID
    amount: Decimal
    payment_method: str
    transaction_id: Optional[str]
    status: str
    paid_at: Optional[datetime]
    model_config = {"from_attributes": True}


class BulkGenerateInvoicesRequest(BaseModel):
    academic_year_id: UUID
    class_id: Optional[UUID] = None  # If null, generate for all classes
    due_date: date


class FeeCollectionReport(BaseModel):
    period: str
    expected: Decimal
    collected: Decimal
    outstanding: Decimal
    collection_rate: float


class StudentFeeStatement(BaseModel):
    student_id: UUID
    total_invoiced: Decimal
    total_paid: Decimal
    total_outstanding: Decimal
    invoices: List[InvoiceResponse]
