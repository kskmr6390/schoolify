from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID
from enum import Enum


class SubmissionStatus(str, Enum):
    SUBMITTED = "submitted"
    LATE = "late"
    GRADED = "graded"
    RETURNED = "returned"


class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    class_id: UUID
    subject_id: Optional[UUID] = None
    due_date: datetime
    max_marks: float = 100.0
    allow_late_submission: bool = False
    attachment_urls: Optional[List[str]] = None


class AssignmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    max_marks: Optional[float] = None
    allow_late_submission: Optional[bool] = None
    attachment_urls: Optional[List[str]] = None


class AssignmentResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    class_id: UUID
    subject_id: Optional[UUID]
    due_date: datetime
    max_marks: float
    allow_late_submission: bool
    is_published: bool
    attachment_urls: Optional[List[str]]
    created_at: datetime

    class Config:
        from_attributes = True


class SubmissionCreate(BaseModel):
    content: Optional[str] = None
    file_urls: Optional[List[str]] = None


class GradeSubmission(BaseModel):
    marks_obtained: float
    feedback: Optional[str] = None

    @validator("marks_obtained")
    def marks_must_be_positive(cls, v):
        if v < 0:
            raise ValueError("Marks cannot be negative")
        return v


class SubmissionResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    student_id: UUID
    status: SubmissionStatus
    content: Optional[str]
    file_urls: Optional[List[str]]
    marks_obtained: Optional[float]
    feedback: Optional[str]
    submitted_at: Optional[datetime]
    graded_at: Optional[datetime]

    class Config:
        from_attributes = True


class ExamCreate(BaseModel):
    title: str
    class_id: UUID
    subject_id: Optional[UUID] = None
    exam_date: date
    duration_minutes: int = 180
    total_marks: float = 100.0
    passing_marks: float = 33.0
    instructions: Optional[str] = None


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    exam_date: Optional[date] = None
    duration_minutes: Optional[int] = None
    total_marks: Optional[float] = None
    passing_marks: Optional[float] = None
    instructions: Optional[str] = None


class ExamResponse(BaseModel):
    id: UUID
    title: str
    class_id: UUID
    subject_id: Optional[UUID]
    exam_date: date
    duration_minutes: int
    total_marks: float
    passing_marks: float
    results_published: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ExamResultEntry(BaseModel):
    student_id: UUID
    marks_obtained: float
    remarks: Optional[str] = None


class BulkResultsCreate(BaseModel):
    results: List[ExamResultEntry]


class ExamResultResponse(BaseModel):
    id: UUID
    exam_id: UUID
    student_id: UUID
    marks_obtained: float
    grade: Optional[str]
    grade_points: Optional[float]
    is_pass: bool
    remarks: Optional[str]

    class Config:
        from_attributes = True
