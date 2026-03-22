from pydantic import BaseModel, HttpUrl
from typing import Optional, Any
from datetime import date
from uuid import UUID

from services.user_service.models import Gender


class AddressSchema(BaseModel):
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    zip: Optional[str] = None


class UserProfileCreate(BaseModel):
    user_id: UUID
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    address: Optional[AddressSchema] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[dict] = None


class UserProfileUpdate(BaseModel):
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    address: Optional[AddressSchema] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    preferences: Optional[dict] = None


class UserProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    phone: Optional[str]
    date_of_birth: Optional[date]
    gender: Optional[Gender]
    address: Optional[dict]
    bio: Optional[str]
    avatar_url: Optional[str]
    preferences: Optional[dict]
    is_profile_complete: bool

    class Config:
        from_attributes = True


class StaffProfileCreate(BaseModel):
    user_id: UUID
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    date_of_joining: Optional[date] = None
    qualifications: Optional[list] = None
    subject_expertise: Optional[list] = None
    emergency_contact: Optional[dict] = None
    salary: Optional[str] = None
    salary_type: Optional[str] = "monthly"
    staff_type: Optional[str] = "teaching"
    leave_balance: Optional[int] = 12


class StaffProfileUpdate(BaseModel):
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    date_of_joining: Optional[date] = None
    qualifications: Optional[list] = None
    subject_expertise: Optional[list] = None
    emergency_contact: Optional[dict] = None
    salary: Optional[str] = None
    salary_type: Optional[str] = None
    staff_type: Optional[str] = None
    leave_balance: Optional[int] = None


class StaffProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    date_of_joining: Optional[date] = None
    qualifications: Optional[list] = None
    subject_expertise: Optional[list] = None
    salary: Optional[str] = None
    salary_type: Optional[str] = None
    staff_type: Optional[str] = None
    leave_balance: Optional[int] = None

    class Config:
        from_attributes = True
