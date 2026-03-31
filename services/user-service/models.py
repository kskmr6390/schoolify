from sqlalchemy import Column, String, Date, Text, Boolean, JSON, Integer, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
import enum

from services.shared.database import TenantAwareModel


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class UserProfile(TenantAwareModel):
    """Extended profile data for any user (linked to auth-service User by user_id)."""
    __tablename__ = "user_profiles"

    user_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(SAEnum(Gender), nullable=True)
    address = Column(JSON, default=dict)          # {street, city, state, country, zip}
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(512), nullable=True)
    preferences = Column(JSON, default=dict)      # UI/notification preferences
    is_profile_complete = Column(Boolean, default=False)


class StaffProfile(TenantAwareModel):
    """Teacher / Admin specific profile info."""
    __tablename__ = "staff_profiles"

    user_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)
    employee_id = Column(String(50), nullable=True)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    date_of_joining = Column(Date, nullable=True)
    qualifications = Column(JSON, default=list)   # [{degree, institution, year}]
    subject_expertise = Column(JSON, default=list)  # list of subject names
    emergency_contact = Column(JSON, default=dict)
    salary = Column(String(20), nullable=True)    # from sqlalchemy import Numeric — kept as string for flexibility
    salary_type = Column(String(20), default="monthly")  # monthly / annual
    staff_type = Column(String(50), default="teaching")  # teaching / non_teaching / admin
    leave_balance = Column(Integer, default=12)


class ParentStudentLink(TenantAwareModel):
    """Links a parent user to one or more student users."""
    __tablename__ = "parent_student_links"

    parent_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    student_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    relationship = Column(String(50), default="parent")   # father, mother, guardian
