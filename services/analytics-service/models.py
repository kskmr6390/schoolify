from sqlalchemy import Column, String, Float, Integer, Date, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from services.shared.database import TenantAwareModel


class DailyAttendanceSnapshot(TenantAwareModel):
    """Materialized daily snapshot for fast dashboard queries."""
    __tablename__ = "daily_attendance_snapshots"

    class_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    total_students = Column(Integer, default=0)
    present_count = Column(Integer, default=0)
    absent_count = Column(Integer, default=0)
    late_count = Column(Integer, default=0)
    attendance_rate = Column(Float, default=0.0)


class MonthlyFeeSnapshot(TenantAwareModel):
    """Materialized monthly fee collection snapshot."""
    __tablename__ = "monthly_fee_snapshots"

    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    total_invoiced = Column(Float, default=0.0)
    total_collected = Column(Float, default=0.0)
    total_outstanding = Column(Float, default=0.0)
    collection_rate = Column(Float, default=0.0)
    payment_count = Column(Integer, default=0)


class EnrollmentSnapshot(TenantAwareModel):
    """Enrollment snapshot per academic year."""
    __tablename__ = "enrollment_snapshots"

    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    class_id = Column(UUID(as_uuid=True), nullable=True)
    total_students = Column(Integer, default=0)
    new_enrollments = Column(Integer, default=0)
    withdrawals = Column(Integer, default=0)
    gender_breakdown = Column(JSON, default=dict)


class AcademicPerformanceSnapshot(TenantAwareModel):
    """Aggregated academic performance per exam."""
    __tablename__ = "academic_performance_snapshots"

    exam_id = Column(UUID(as_uuid=True), nullable=False)
    class_id = Column(UUID(as_uuid=True), nullable=True)
    subject_id = Column(UUID(as_uuid=True), nullable=True)
    avg_score = Column(Float, default=0.0)
    pass_rate = Column(Float, default=0.0)
    grade_distribution = Column(JSON, default=dict)
    total_students = Column(Integer, default=0)
