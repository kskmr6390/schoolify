"""Student service Pydantic schemas."""
from datetime import date, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AcademicYearCreate(BaseModel):
    name: str = Field(pattern=r'^\d{4}-\d{2,4}$')
    start_date: date
    end_date: date
    is_current: bool = False


class AcademicYearResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    start_date: date
    end_date: date
    is_current: bool
    model_config = {"from_attributes": True}


class ClassCreate(BaseModel):
    academic_year_id: UUID
    name: str
    grade: int = Field(ge=1, le=12)
    section: str = Field(max_length=10)
    capacity: int = Field(default=40, ge=1, le=200)
    class_teacher_id: Optional[UUID] = None


class ClassResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    grade: int
    section: str
    capacity: int
    class_teacher_id: Optional[UUID]
    model_config = {"from_attributes": True}


class SubjectCreate(BaseModel):
    name: str
    code: str = Field(max_length=20)
    description: Optional[str] = None


class SubjectResponse(BaseModel):
    id: UUID
    name: str
    code: str
    description: Optional[str]
    is_active: bool
    model_config = {"from_attributes": True}


class TimetableSlotCreate(BaseModel):
    class_id: UUID
    subject_id: UUID
    teacher_id: UUID
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    room: Optional[str] = None
    period_number: Optional[int] = None


class TimetableSlotResponse(BaseModel):
    id: UUID
    class_id: UUID
    subject_id: UUID
    teacher_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    room: Optional[str]
    period_number: Optional[int]
    model_config = {"from_attributes": True}


class AddressSchema(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    country: str = "India"


class EmergencyContactSchema(BaseModel):
    name: str
    phone: str
    relationship: str


class StudentCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[AddressSchema] = None
    enrollment_date: date
    class_id: Optional[UUID] = None
    roll_number: Optional[int] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[EmergencyContactSchema] = None


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[AddressSchema] = None
    class_id: Optional[UUID] = None
    roll_number: Optional[int] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[EmergencyContactSchema] = None
    status: Optional[str] = None


class StudentResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    student_code: str
    first_name: str
    last_name: str
    dob: Optional[date]
    gender: Optional[str]
    enrollment_date: date
    class_id: Optional[UUID]
    roll_number: Optional[int]
    blood_group: Optional[str]
    status: str
    profile_photo_url: Optional[str]
    model_config = {"from_attributes": True}


class ParentCreate(BaseModel):
    student_id: UUID
    first_name: str
    last_name: str
    relation_type: str                   # father | mother | guardian
    phone: str
    email: Optional[str] = None
    occupation: Optional[str] = None
    is_emergency_contact: bool = False


class ParentResponse(BaseModel):
    id: UUID
    student_id: UUID
    first_name: str
    last_name: str
    relation_type: str
    phone: str
    email: Optional[str]
    model_config = {"from_attributes": True}


# ── Feed / Posts ────────────────────────────────────────────────────────────

class PostCreate(BaseModel):
    title: Optional[str] = None
    content: str
    post_type: str = "general"
    visibility: str = "all"
    tagged_class_ids: Optional[List[UUID]] = None
    attachment_urls: Optional[List[str]] = None


class PostResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    author_id: UUID
    author_name: str
    author_role: str
    title: Optional[str]
    content: str
    post_type: str
    visibility: str
    tagged_class_ids: Optional[List[UUID]]
    attachment_urls: Optional[List[str]] = None
    likes_count: int
    comments_count: int
    created_at: str
    liked_by_me: bool = False
    model_config = {"from_attributes": True}
