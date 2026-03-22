"""
Student service models.
Covers: Academic Years, Classes, Subjects, Timetable, Students, Parents, Documents.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import (Boolean, Column, Date, DateTime, Enum, ForeignKey,
                        Integer, String, Text, Time, UniqueConstraint)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from ..shared.database import TenantAwareModel


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class StudentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    GRADUATED = "graduated"
    TRANSFERRED = "transferred"
    SUSPENDED = "suspended"


class AcademicYear(TenantAwareModel):
    __tablename__ = "academic_years"
    __table_args__ = (UniqueConstraint("tenant_id", "name"),)

    name = Column(String(20), nullable=False)   # e.g., "2024-25"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)


class Class(TenantAwareModel):
    __tablename__ = "classes"

    academic_year_id = Column(UUID(as_uuid=True), ForeignKey("academic_years.id"), nullable=False)
    name = Column(String(100), nullable=False)  # "Grade 10-A"
    grade = Column(Integer, nullable=False)     # 1-12
    section = Column(String(10), nullable=False)  # "A", "B", etc.
    capacity = Column(Integer, default=40)
    class_teacher_id = Column(UUID(as_uuid=True), nullable=True)  # FK to users

    students = relationship("Student", back_populates="class_")
    timetable_slots = relationship("TimetableSlot", back_populates="class_")


class Subject(TenantAwareModel):
    __tablename__ = "subjects"
    __table_args__ = (UniqueConstraint("tenant_id", "code"),)

    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=False)   # e.g., "MATH10", "ENG9"
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)


class ClassSubject(TenantAwareModel):
    """Maps which teacher teaches which subject to which class."""
    __tablename__ = "class_subjects"
    __table_args__ = (UniqueConstraint("tenant_id", "class_id", "subject_id"),)

    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), nullable=False)  # FK to users


class TimetableSlot(TenantAwareModel):
    """A single period in the weekly timetable."""
    __tablename__ = "timetable_slots"

    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), nullable=False)
    day_of_week = Column(Integer, nullable=False)   # 0=Monday, 4=Friday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    room = Column(String(50), nullable=True)
    period_number = Column(Integer, nullable=True)

    class_ = relationship("Class", back_populates="timetable_slots")


class Student(TenantAwareModel):
    """Core student record."""
    __tablename__ = "students"
    __table_args__ = (UniqueConstraint("tenant_id", "student_code"),)

    user_id = Column(UUID(as_uuid=True), nullable=True)  # Links to auth users table
    student_code = Column(String(50), nullable=False)    # Auto-generated: SCH-2024-001
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    dob = Column(Date, nullable=True)
    gender = Column(Enum(Gender), nullable=True)
    address = Column(JSONB, nullable=True)              # {street, city, state, pincode}
    enrollment_date = Column(Date, nullable=False)
    class_id = Column(UUID(as_uuid=True), ForeignKey("classes.id"), nullable=True)
    roll_number = Column(Integer, nullable=True)
    blood_group = Column(String(5), nullable=True)
    emergency_contact = Column(JSONB, nullable=True)    # {name, phone, relationship}
    status = Column(Enum(StudentStatus), default=StudentStatus.ACTIVE)
    profile_photo_url = Column(String(500), nullable=True)

    class_ = relationship("Class", back_populates="students")
    parents = relationship("Parent", back_populates="student", cascade="all, delete-orphan")
    documents = relationship("StudentDocument", back_populates="student", cascade="all, delete-orphan")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Parent(TenantAwareModel):
    """Parent/Guardian linked to a student."""
    __tablename__ = "parents"

    user_id = Column(UUID(as_uuid=True), nullable=True)  # For portal access
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    relation_type = Column(String(50), nullable=False)  # father, mother, guardian
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    occupation = Column(String(100), nullable=True)
    is_emergency_contact = Column(Boolean, default=False)

    student = relationship("Student", back_populates="parents")


class StudentDocument(TenantAwareModel):
    """Documents uploaded for a student (birth certificate, transfer certificate, etc.)"""
    __tablename__ = "student_documents"

    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=False)
    document_type = Column(String(100), nullable=False)  # birth_certificate, aadhar, etc.
    file_url = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), nullable=False)

    student = relationship("Student", back_populates="documents")


# ── Feed / Posts ─────────────────────────────────────────────────────────────

class PostType(str, enum.Enum):
    ANNOUNCEMENT = "announcement"
    MEETING = "meeting"
    EVENT = "event"
    GENERAL = "general"


class PostVisibility(str, enum.Enum):
    ALL = "all"
    CLASS_SPECIFIC = "class_specific"
    TEACHERS = "teachers"
    STUDENTS = "students"
    PARENTS = "parents"


class Post(TenantAwareModel):
    """School social feed post — announcements, meetings, events."""
    __tablename__ = "posts"

    author_id = Column(UUID(as_uuid=True), nullable=False)
    author_name = Column(String(200), nullable=False)
    author_role = Column(String(50), nullable=False)
    title = Column(String(300), nullable=True)
    content = Column(Text, nullable=False)
    post_type = Column(Enum(PostType), default=PostType.GENERAL, nullable=False)
    visibility = Column(Enum(PostVisibility), default=PostVisibility.ALL, nullable=False)
    tagged_class_ids = Column(ARRAY(UUID(as_uuid=True)), nullable=True)
    attachment_urls = Column(ARRAY(String), nullable=True)  # photo/video URLs
    likes_count = Column(Integer, default=0, nullable=False)
    comments_count = Column(Integer, default=0, nullable=False)

    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")


class PostLike(TenantAwareModel):
    """A user liking a post."""
    __tablename__ = "post_likes"
    __table_args__ = (UniqueConstraint("tenant_id", "post_id", "user_id"),)

    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    user_role = Column(String(50), nullable=False)

    post = relationship("Post", back_populates="likes")
