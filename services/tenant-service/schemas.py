"""Tenant service Pydantic schemas."""
from datetime import datetime
from typing import Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
import re


class CreateTenantRequest(BaseModel):
    slug: str = Field(min_length=3, max_length=100, pattern=r'^[a-z0-9-]+$')
    name: str = Field(min_length=2, max_length=255)
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    plan: str = "trial"

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v):
        reserved = {"www", "api", "app", "admin", "mail", "static", "assets"}
        if v in reserved:
            raise ValueError(f"'{v}' is a reserved slug")
        return v.lower()


class UpdateTenantRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    secondary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    domain: Optional[str] = None


class TenantResponse(BaseModel):
    id: UUID
    slug: str
    name: str
    domain: Optional[str]
    logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    plan: str
    status: str
    created_at: datetime
    onboarded_at: Optional[datetime]

    model_config = {"from_attributes": True}


class TenantBrandingResponse(BaseModel):
    """Lightweight branding info for client apps to configure UI."""
    tenant_id: UUID
    name: str
    logo_url: Optional[str]
    primary_color: str
    secondary_color: str
    favicon_url: Optional[str]


class OnboardTenantRequest(BaseModel):
    """Complete tenant onboarding: create admin user + initial configuration."""
    admin_email: str
    admin_password: str = Field(min_length=8)
    admin_first_name: str
    admin_last_name: str
    school_name: str
    academic_year_name: str = "2024-25"
    timezone: str = "Asia/Kolkata"
    currency: str = "INR"


class FeatureFlagUpdate(BaseModel):
    enabled: bool
    config: Optional[Dict] = None


class TenantSettingsUpdate(BaseModel):
    settings: Dict[str, str]  # key -> value pairs


class TenantStatsResponse(BaseModel):
    tenant_id: UUID
    total_students: int
    total_teachers: int
    total_parents: int
    plan: str
    status: str
