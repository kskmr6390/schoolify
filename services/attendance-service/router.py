"""Attendance service router."""
from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.database import get_db
from ..shared.events import Topics, event_producer
from ..shared.schemas import PaginatedResponse, PaginationParams, StandardResponse
from ..shared.security import get_current_user, require_roles
from .models import AttendanceEntry, AttendanceRecord, AttendanceStatus
from .schemas import (AttendanceRecordResponse, AttendanceSummary,
                      LowAttendanceAlert, MarkAttendanceRequest)

router = APIRouter(prefix="/api/v1/attendance", tags=["Attendance"])

LOW_ATTENDANCE_THRESHOLD = 75.0  # percent


@router.post("", response_model=StandardResponse[AttendanceRecordResponse], status_code=201)
async def mark_attendance(
    body: MarkAttendanceRequest,
    current_user=Depends(require_roles("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark attendance for a class session.
    Prevents duplicate marking for the same class+date+period.
    """
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    # Check for duplicate
    existing = await db.execute(
        select(AttendanceRecord).where(
            and_(
                AttendanceRecord.tenant_id == tid,
                AttendanceRecord.class_id == body.class_id,
                AttendanceRecord.date == body.date,
                AttendanceRecord.subject_id == body.subject_id,
                AttendanceRecord.period == body.period,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Attendance already marked for this session")

    record = AttendanceRecord(
        tenant_id=tid,
        class_id=body.class_id,
        subject_id=body.subject_id,
        date=body.date,
        period=body.period,
        recorded_by=UUIDT(current_user.user_id),
    )
    db.add(record)
    await db.flush()

    # Add individual entries
    absent_students = []
    for entry in body.entries:
        db.add(AttendanceEntry(
            record_id=record.id,
            student_id=entry.student_id,
            status=entry.status,
            notes=entry.notes,
        ))
        if entry.status == "absent":
            absent_students.append(str(entry.student_id))

    await db.flush()

    # Publish event (notification service will alert parents of absent students)
    await event_producer.publish(
        Topics.ATTENDANCE_MARKED, "attendance.marked", str(tid),
        {
            "record_id": str(record.id),
            "class_id": str(body.class_id),
            "date": str(body.date),
            "absent_student_ids": absent_students,
        }
    )

    # Check for low attendance after marking
    await _check_low_attendance(body.class_id, tid, db)

    # Re-fetch with entries
    await db.refresh(record)
    return StandardResponse.ok(AttendanceRecordResponse.model_validate(record))


@router.get("/class/{class_id}", response_model=StandardResponse[list[AttendanceRecordResponse]])
async def get_class_attendance(
    class_id: UUID,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(AttendanceRecord).where(AttendanceRecord.class_id == class_id)
    if from_date:
        query = query.where(AttendanceRecord.date >= from_date)
    if to_date:
        query = query.where(AttendanceRecord.date <= to_date)
    query = query.order_by(AttendanceRecord.date.desc())

    result = await db.execute(query)
    records = result.scalars().all()
    return StandardResponse.ok([AttendanceRecordResponse.model_validate(r) for r in records])


@router.get("/student/{student_id}/summary", response_model=StandardResponse[AttendanceSummary])
async def get_student_summary(
    student_id: UUID,
    from_date: Optional[date] = Query(None, description="Default: 90 days ago"),
    to_date: Optional[date] = Query(None, description="Default: today"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate attendance summary with percentage."""
    if not from_date:
        from_date = date.today() - timedelta(days=90)
    if not to_date:
        to_date = date.today()

    # Count by status
    result = await db.execute(
        select(AttendanceEntry.status, func.count(AttendanceEntry.id).label("count"))
        .join(AttendanceRecord, AttendanceEntry.record_id == AttendanceRecord.id)
        .where(
            and_(
                AttendanceEntry.student_id == student_id,
                AttendanceRecord.date.between(from_date, to_date),
            )
        )
        .group_by(AttendanceEntry.status)
    )
    rows = result.all()

    counts = {row.status: row.count for row in rows}
    present = counts.get(AttendanceStatus.PRESENT, 0)
    absent = counts.get(AttendanceStatus.ABSENT, 0)
    late = counts.get(AttendanceStatus.LATE, 0)
    excused = counts.get(AttendanceStatus.EXCUSED, 0)
    total = present + absent + late + excused

    percentage = round((present + late) / total * 100, 2) if total > 0 else 0.0

    return StandardResponse.ok(AttendanceSummary(
        student_id=student_id,
        total_days=total,
        present=present,
        absent=absent,
        late=late,
        excused=excused,
        percentage=percentage,
    ))


@router.get("/low-attendance", response_model=StandardResponse[list[LowAttendanceAlert]])
async def get_low_attendance_students(
    class_id: Optional[UUID] = Query(None),
    threshold: float = Query(default=LOW_ATTENDANCE_THRESHOLD),
    current_user=Depends(require_roles("admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    """Get students whose attendance is below threshold."""
    from_date = date.today() - timedelta(days=90)
    alerts = []

    # Get all students in tenant (simplified - would join with student service)
    query = (
        select(
            AttendanceEntry.student_id,
            AttendanceEntry.status,
            func.count(AttendanceEntry.id).label("count")
        )
        .join(AttendanceRecord, AttendanceEntry.record_id == AttendanceRecord.id)
        .where(AttendanceRecord.date >= from_date)
    )
    if class_id:
        query = query.where(AttendanceRecord.class_id == class_id)
    query = query.group_by(AttendanceEntry.student_id, AttendanceEntry.status)

    result = await db.execute(query)
    rows = result.all()

    # Aggregate by student
    from collections import defaultdict
    student_counts = defaultdict(lambda: defaultdict(int))
    for row in rows:
        student_counts[row.student_id][row.status] += row.count

    for student_id, counts in student_counts.items():
        present = counts.get(AttendanceStatus.PRESENT, 0)
        late = counts.get(AttendanceStatus.LATE, 0)
        total = sum(counts.values())
        if total > 0:
            pct = (present + late) / total * 100
            if pct < threshold:
                alerts.append(LowAttendanceAlert(
                    student_id=student_id,
                    student_name="",  # Would be fetched from student service
                    class_id=class_id or UUID("00000000-0000-0000-0000-000000000000"),
                    attendance_percentage=round(pct, 2),
                    threshold=threshold,
                ))

    return StandardResponse.ok(alerts)


async def _check_low_attendance(class_id: UUID, tenant_id, db: AsyncSession):
    """Background check after marking - publish alert events for low-attendance students."""
    # Simplified version - full implementation would check all students in class
    pass
