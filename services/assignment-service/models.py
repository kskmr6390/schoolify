"""Assignment and Exam models."""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (Boolean, Column, DateTime, Enum, ForeignKey, Integer,
                        Numeric, String, Text, UniqueConstraint)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from ..shared.database import Base, TenantAwareModel


class AssignmentType(str, enum.Enum):
    HOMEWORK = "homework"
    PROJECT = "project"
    QUIZ = "quiz"
    CLASSWORK = "classwork"


class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"        # Not yet submitted
    SUBMITTED = "submitted"    # Submitted, awaiting grading
    GRADED = "graded"          # Graded
    RETURNED = "returned"      # Returned to student for revision
    LATE = "late"              # Submitted after due date


class ExamType(str, enum.Enum):
    UNIT_TEST = "unit_test"
    MIDTERM = "midterm"
    FINAL = "final"
    PRACTICAL = "practical"
    INTERNAL = "internal"


class Assignment(TenantAwareModel):
    __tablename__ = "assignments"

    class_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=False)
    max_marks = Column(Numeric(5, 2), default=100)
    assignment_type = Column(Enum(AssignmentType), default=AssignmentType.HOMEWORK)
    attachment_urls = Column(ARRAY(String), default=[])
    allow_late_submission = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)
    published_at = Column(DateTime, nullable=True)

    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete-orphan")


class Submission(TenantAwareModel):
    __tablename__ = "submissions"
    __table_args__ = (UniqueConstraint("tenant_id", "assignment_id", "student_id"),)

    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    file_urls = Column(ARRAY(String), default=[])
    text_response = Column(Text, nullable=True)
    marks_obtained = Column(Numeric(5, 2), nullable=True)
    feedback = Column(Text, nullable=True)
    status = Column(Enum(SubmissionStatus), default=SubmissionStatus.PENDING)
    graded_by = Column(UUID(as_uuid=True), nullable=True)
    graded_at = Column(DateTime, nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")


class Exam(TenantAwareModel):
    __tablename__ = "exams"

    class_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    subject_id = Column(UUID(as_uuid=True), nullable=False)
    academic_year_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(255), nullable=False)
    exam_type = Column(Enum(ExamType), nullable=False)
    exam_date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    max_marks = Column(Numeric(5, 2), nullable=False)
    passing_marks = Column(Numeric(5, 2), nullable=True)
    instructions = Column(Text, nullable=True)
    is_published = Column(Boolean, default=False)
    results_published = Column(Boolean, default=False)

    results = relationship("ExamResult", back_populates="exam", cascade="all, delete-orphan")


class ExamResult(TenantAwareModel):
    __tablename__ = "exam_results"
    __table_args__ = (UniqueConstraint("tenant_id", "exam_id", "student_id"),)

    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(UUID(as_uuid=True), nullable=False)
    marks_obtained = Column(Numeric(5, 2), nullable=False)
    grade = Column(String(5), nullable=True)      # A+, A, B+, B, C, D, F
    grade_points = Column(Numeric(3, 1), nullable=True)
    is_pass = Column(Boolean, nullable=True)
    remarks = Column(Text, nullable=True)
    entered_by = Column(UUID(as_uuid=True), nullable=False)

    exam = relationship("Exam", back_populates="results")
