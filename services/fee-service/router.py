"""Fee service API router with idempotent payment processing."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.database import get_db
from ..shared.events import Topics, event_producer
from ..shared.redis_client import set_with_lock
from ..shared.schemas import PaginatedResponse, PaginationParams, StandardResponse
from ..shared.security import get_current_user, require_roles
from .models import (FeeReceipt, FeeStructure, Invoice, InvoiceItem,
                     InvoiceStatus, Payment, PaymentStatus)
from .schemas import (BulkGenerateInvoicesRequest, CreateInvoiceRequest,
                      FeeCollectionReport, FeeReceiptResponse, FeeStructureCreate,
                      FeeStructureResponse, GenerateReceiptRequest, InvoiceResponse,
                      PaymentResponse, RecordPaymentRequest, StudentFeeStatement)

router = APIRouter(prefix="/api/v1/fees", tags=["Fees & Billing"])


# ── Fee Structures ─────────────────────────────────────────────────────────────

@router.get("/structures", response_model=StandardResponse[list[FeeStructureResponse]])
async def list_fee_structures(
    academic_year_id: Optional[UUID] = Query(None),
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    query = select(FeeStructure).where(FeeStructure.tenant_id == UUIDT(current_user.tenant_id))
    if academic_year_id:
        query = query.where(FeeStructure.academic_year_id == academic_year_id)
    result = await db.execute(query)
    return StandardResponse.ok([FeeStructureResponse.model_validate(f) for f in result.scalars().all()])


@router.post("/structures", response_model=StandardResponse[FeeStructureResponse], status_code=201)
async def create_fee_structure(
    body: FeeStructureCreate,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    fs = FeeStructure(tenant_id=UUIDT(current_user.tenant_id), **body.model_dump())
    db.add(fs)
    await db.flush()
    return StandardResponse.ok(FeeStructureResponse.model_validate(fs))


@router.patch("/structures/{structure_id}", response_model=StandardResponse[FeeStructureResponse])
async def update_fee_structure(
    structure_id: UUID,
    body: FeeStructureCreate,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    res = await db.execute(select(FeeStructure).where(
        FeeStructure.id == structure_id, FeeStructure.tenant_id == UUIDT(current_user.tenant_id)
    ))
    fs = res.scalar_one_or_none()
    if not fs:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(fs, k, v)
    await db.flush()
    return StandardResponse.ok(FeeStructureResponse.model_validate(fs))


@router.delete("/structures/{structure_id}", response_model=StandardResponse[dict])
async def delete_fee_structure(
    structure_id: UUID,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    res = await db.execute(select(FeeStructure).where(
        FeeStructure.id == structure_id, FeeStructure.tenant_id == UUIDT(current_user.tenant_id)
    ))
    fs = res.scalar_one_or_none()
    if not fs:
        raise HTTPException(status_code=404, detail="Fee structure not found")
    await db.delete(fs)
    return StandardResponse.ok({"deleted": True})


# ── Invoices ───────────────────────────────────────────────────────────────────

@router.get("/invoices", response_model=StandardResponse[PaginatedResponse[InvoiceResponse]])
async def list_invoices(
    params: PaginationParams = Depends(),
    status: Optional[str] = Query(None),
    student_id: Optional[UUID] = Query(None),
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    query = select(Invoice).where(Invoice.tenant_id == tid)
    if status:
        query = query.where(Invoice.status == status)
    if student_id:
        query = query.where(Invoice.student_id == student_id)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    result = await db.execute(
        query.options(selectinload(Invoice.items))
        .offset(params.offset).limit(params.limit).order_by(Invoice.created_at.desc())
    )

    return StandardResponse.ok(PaginatedResponse.create(
        items=[InvoiceResponse.model_validate(i) for i in result.scalars().all()],
        total=total, page=params.page, limit=params.limit,
    ))


@router.post("/invoices", response_model=StandardResponse[InvoiceResponse], status_code=201)
async def create_invoice(
    body: CreateInvoiceRequest,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Create invoice with optional idempotency key."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    # Idempotency check: if key provided, return existing if already processed
    if body.idempotency_key:
        existing = await db.execute(
            select(Invoice).where(Invoice.idempotency_key == body.idempotency_key)
        )
        existing_invoice = existing.scalar_one_or_none()
        if existing_invoice:
            return StandardResponse.ok(InvoiceResponse.model_validate(existing_invoice))

    # Auto-generate invoice number
    count_result = await db.execute(
        select(func.count(Invoice.id)).where(Invoice.tenant_id == tid)
    )
    count = count_result.scalar() + 1
    year = date.today().year
    invoice_number = f"INV-{year}-{count:05d}"

    total_amount = sum(item.amount * item.quantity for item in body.items)

    invoice = Invoice(
        tenant_id=tid,
        student_id=body.student_id,
        academic_year_id=body.academic_year_id,
        invoice_number=invoice_number,
        total_amount=total_amount,
        issued_date=date.today(),
        due_date=body.due_date,
        notes=body.notes,
        idempotency_key=body.idempotency_key,
    )
    db.add(invoice)
    await db.flush()

    for item in body.items:
        db.add(InvoiceItem(
            invoice_id=invoice.id,
            fee_structure_id=item.fee_structure_id,
            description=item.description,
            amount=item.amount,
            quantity=item.quantity,
        ))

    await db.flush()
    await db.refresh(invoice)

    # Publish event
    await event_producer.publish(
        Topics.FEE_INVOICE_CREATED, "fee.invoice_created", str(tid),
        {"invoice_id": str(invoice.id), "student_id": str(body.student_id), "amount": float(total_amount)}
    )

    return StandardResponse.ok(InvoiceResponse.model_validate(invoice))


@router.get("/invoices/student/{student_id}", response_model=StandardResponse[StudentFeeStatement])
async def get_student_fee_statement(
    student_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(
        select(Invoice).where(and_(Invoice.student_id == student_id, Invoice.tenant_id == tid))
        .order_by(Invoice.issued_date.desc())
    )
    invoices = result.scalars().all()

    total_invoiced = sum(i.total_amount for i in invoices)
    total_paid = sum(i.paid_amount for i in invoices)
    total_outstanding = total_invoiced - total_paid

    return StandardResponse.ok(StudentFeeStatement(
        student_id=student_id,
        total_invoiced=total_invoiced,
        total_paid=total_paid,
        total_outstanding=total_outstanding,
        invoices=[InvoiceResponse.model_validate(i) for i in invoices],
    ))


@router.post("/invoices/bulk-generate", response_model=StandardResponse[dict])
async def bulk_generate_invoices(
    body: BulkGenerateInvoicesRequest,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Generate invoices for all students based on fee structures."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    # Get applicable fee structures
    query = select(FeeStructure).where(
        and_(FeeStructure.tenant_id == tid,
             FeeStructure.academic_year_id == body.academic_year_id,
             FeeStructure.is_active == True)
    )
    if body.class_id:
        query = query.where(
            (FeeStructure.class_id == body.class_id) | (FeeStructure.class_id == None)
        )
    result = await db.execute(query)
    fee_structures = result.scalars().all()

    if not fee_structures:
        raise HTTPException(status_code=400, detail="No active fee structures found")

    # This would normally query student service for the list of students
    # For now, return a placeholder
    return StandardResponse.ok({
        "message": "Bulk invoice generation started",
        "fee_structures_count": len(fee_structures),
        "status": "background_job_queued",
    })


# ── Payments ───────────────────────────────────────────────────────────────────

@router.post("/payments", response_model=StandardResponse[PaymentResponse], status_code=201)
async def record_payment(
    body: RecordPaymentRequest,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Record a payment with idempotency guarantee.

    Flow:
    1. Check Redis for idempotency key (fast path)
    2. Check DB for idempotency key (slow path, handles Redis failures)
    3. Process payment and update invoice
    4. Cache idempotency key in Redis
    5. Publish FEE_PAID event
    """
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    # Step 1: Check Redis idempotency cache (24-hour window)
    redis_key = f"payment:idempotency:{body.idempotency_key}"
    already_processed = not await set_with_lock(redis_key, {"status": "processing"}, ttl=86400)

    if already_processed:
        # Return existing payment
        existing = await db.execute(
            select(Payment).where(Payment.idempotency_key == body.idempotency_key)
        )
        existing_payment = existing.scalar_one_or_none()
        if existing_payment:
            return StandardResponse.ok(PaymentResponse.model_validate(existing_payment))

    # Step 2: Check DB (handles Redis failure case)
    existing = await db.execute(
        select(Payment).where(Payment.idempotency_key == body.idempotency_key)
    )
    if existing.scalar_one_or_none():
        existing_payment = existing.scalar_one_or_none()
        return StandardResponse.ok(PaymentResponse.model_validate(existing_payment))

    # Get invoice
    invoice = await db.get(Invoice, body.invoice_id)
    if not invoice or str(invoice.tenant_id) != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.status == InvoiceStatus.PAID:
        raise HTTPException(status_code=400, detail="Invoice is already fully paid")

    if invoice.status == InvoiceStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Invoice is cancelled")

    # Create payment record
    payment = Payment(
        tenant_id=tid,
        invoice_id=body.invoice_id,
        student_id=invoice.student_id,
        amount=body.amount,
        payment_method=body.payment_method,
        transaction_id=body.transaction_id,
        idempotency_key=body.idempotency_key,
        status=PaymentStatus.COMPLETED,
        paid_at=datetime.utcnow(),
        recorded_by=UUIDT(current_user.user_id),
    )
    db.add(payment)

    # Update invoice
    invoice.paid_amount = invoice.paid_amount + body.amount
    if invoice.paid_amount >= invoice.total_amount + invoice.late_fee - invoice.discount_amount:
        invoice.status = InvoiceStatus.PAID
    else:
        invoice.status = InvoiceStatus.PARTIAL

    await db.flush()

    # Publish event for notification service
    await event_producer.publish(
        Topics.FEE_PAID, "fee.paid", str(tid),
        {
            "payment_id": str(payment.id),
            "invoice_id": str(body.invoice_id),
            "student_id": str(invoice.student_id),
            "amount": float(body.amount),
        }
    )

    return StandardResponse.ok(PaymentResponse.model_validate(payment))


# ── Fee Receipts ───────────────────────────────────────────────────────────────

@router.post("/receipts/generate", response_model=StandardResponse[FeeReceiptResponse], status_code=201)
async def generate_receipt(
    body: GenerateReceiptRequest,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Generate or regenerate a fee receipt for one or multiple invoices (clubbed)."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    # Fetch and validate all invoices belong to this tenant + student
    result = await db.execute(
        select(Invoice)
        .options(selectinload(Invoice.items))
        .where(
            Invoice.id.in_(body.invoice_ids),
            Invoice.tenant_id == tid,
            Invoice.student_id == body.student_id,
        )
    )
    invoices = result.scalars().all()

    if len(invoices) != len(body.invoice_ids):
        raise HTTPException(status_code=404, detail="One or more invoices not found or don't belong to this student")

    # Soft-delete any existing non-deleted receipts covering the same invoice set
    existing_res = await db.execute(
        select(FeeReceipt).where(
            FeeReceipt.student_id == body.student_id,
            FeeReceipt.tenant_id == tid,
            FeeReceipt.is_deleted == False,
        )
    )
    for existing in existing_res.scalars().all():
        existing_ids = set(str(i) for i in (existing.invoice_ids or []))
        new_ids = set(str(i) for i in body.invoice_ids)
        if existing_ids & new_ids:  # overlapping invoices → supersede
            existing.is_deleted = True
            existing.deleted_at = datetime.utcnow()

    # Auto-generate receipt number
    count_res = await db.execute(
        select(func.count(FeeReceipt.id)).where(FeeReceipt.tenant_id == tid)
    )
    count = (count_res.scalar() or 0) + 1
    year = date.today().year
    receipt_number = f"RCP-{year}-{count:05d}"

    total_amount = sum(inv.total_amount for inv in invoices)
    paid_amount = sum(inv.paid_amount for inv in invoices)

    receipt = FeeReceipt(
        tenant_id=tid,
        receipt_number=receipt_number,
        student_id=body.student_id,
        invoice_ids=[str(i) for i in body.invoice_ids],
        template=body.template,
        is_clubbed=len(body.invoice_ids) > 1,
        total_amount=total_amount,
        paid_amount=paid_amount,
        notes=body.notes,
        generated_by=UUIDT(current_user.user_id),
    )
    db.add(receipt)
    await db.flush()
    await db.refresh(receipt)

    return StandardResponse.ok(FeeReceiptResponse(
        **{k: v for k, v in receipt.__dict__.items() if not k.startswith('_')},
        invoices=[InvoiceResponse.model_validate(inv) for inv in invoices],
    ))


@router.get("/receipts/student/{student_id}", response_model=StandardResponse[list[FeeReceiptResponse]])
async def get_student_receipts(
    student_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all non-deleted receipts for a student."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    result = await db.execute(
        select(FeeReceipt).where(
            FeeReceipt.student_id == student_id,
            FeeReceipt.tenant_id == tid,
            FeeReceipt.is_deleted == False,
        ).order_by(FeeReceipt.created_at.desc())
    )
    receipts = result.scalars().all()

    enriched = []
    for receipt in receipts:
        inv_ids = [UUIDT(str(i)) for i in (receipt.invoice_ids or [])]
        inv_res = await db.execute(
            select(Invoice).options(selectinload(Invoice.items))
            .where(Invoice.id.in_(inv_ids))
        )
        invoices = inv_res.scalars().all()
        enriched.append(FeeReceiptResponse(
            **{k: v for k, v in receipt.__dict__.items() if not k.startswith('_')},
            invoices=[InvoiceResponse.model_validate(inv) for inv in invoices],
        ))

    return StandardResponse.ok(enriched)


@router.delete("/receipts/{receipt_id}", response_model=StandardResponse[dict])
async def delete_receipt(
    receipt_id: UUID,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a receipt (admin only). Can regenerate after deleting."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    res = await db.execute(
        select(FeeReceipt).where(
            FeeReceipt.id == receipt_id,
            FeeReceipt.tenant_id == tid,
            FeeReceipt.is_deleted == False,
        )
    )
    receipt = res.scalar_one_or_none()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    receipt.is_deleted = True
    receipt.deleted_at = datetime.utcnow()
    await db.flush()

    return StandardResponse.ok({"deleted": True, "receipt_id": str(receipt_id)})


@router.get("/reports/collection", response_model=StandardResponse[FeeCollectionReport])
async def fee_collection_report(
    from_date: date = Query(...),
    to_date: date = Query(...),
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    result = await db.execute(
        select(
            func.sum(Invoice.total_amount).label("expected"),
            func.sum(Invoice.paid_amount).label("collected"),
        ).where(
            and_(Invoice.tenant_id == tid, Invoice.issued_date.between(from_date, to_date))
        )
    )
    row = result.one()
    expected = row.expected or Decimal(0)
    collected = row.collected or Decimal(0)
    outstanding = expected - collected
    rate = float(collected / expected * 100) if expected > 0 else 0.0

    return StandardResponse.ok(FeeCollectionReport(
        period=f"{from_date} to {to_date}",
        expected=expected,
        collected=collected,
        outstanding=outstanding,
        collection_rate=round(rate, 2),
    ))
