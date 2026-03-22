"""Attendance service schemas."""
from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class AttendanceEntryInput(BaseModel):
    student_id: UUID
    status: str  # present, absent, late, excused
    notes: Optional[str] = None


class MarkAttendanceRequest(BaseModel):
    class_id: UUID
    date: date
    subject_id: Optional[UUID] = None
    period: Optional[int] = None
    entries: List[AttendanceEntryInput]


class AttendanceEntryResponse(BaseModel):
    id: UUID
    student_id: UUID
    status: str
    notes: Optional[str]
    marked_at: datetime
    model_config = {"from_attributes": True}


class AttendanceRecordResponse(BaseModel):
    id: UUID
    class_id: UUID
    subject_id: Optional[UUID]
    date: date
    period: Optional[int]
    recorded_by: UUID
    entries: List[AttendanceEntryResponse] = []
    model_config = {"from_attributes": True}


class AttendanceSummary(BaseModel):
    student_id: UUID
    total_days: int
    present: int
    absent: int
    late: int
    excused: int
    percentage: float  # (present + late) / total_days * 100


class LowAttendanceAlert(BaseModel):
    student_id: UUID
    student_name: str
    class_id: UUID
    attendance_percentage: float
    threshold: float
