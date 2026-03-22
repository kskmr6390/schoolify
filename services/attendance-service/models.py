"""Attendance service models."""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from ..shared.database import Base, TenantAwareModel


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class AttendanceRecord(TenantAwareModel):
    """
    Master record for one attendance session (class + date + optional period).
    One record per class per day (or per period if subject-wise tracking is enabled).
    """
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint("tenant_id", "class_id", "date", "subject_id", "period",
                         name="uq_attendance_class_date_period"),
    )

    class_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), nullable=True)   # Null = daily attendance
    date = Column(Date, nullable=False, index=True)
    period = Column(Integer, nullable=True)                   # Period number
    recorded_by = Column(UUID(as_uuid=True), nullable=False)  # Teacher user_id
    notes = Column(Text, nullable=True)

    entries = relationship("AttendanceEntry", back_populates="record", cascade="all, delete-orphan")


class AttendanceEntry(Base):
    """Individual student entry within an attendance record."""
    __tablename__ = "attendance_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    status = Column(Enum(AttendanceStatus), nullable=False, default=AttendanceStatus.PRESENT)
    notes = Column(Text, nullable=True)
    marked_at = Column(DateTime, default=datetime.utcnow)

    record = relationship("AttendanceRecord", back_populates="entries")
