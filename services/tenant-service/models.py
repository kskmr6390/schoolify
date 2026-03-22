"""Tenant service models."""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from ..shared.database import Base


class TenantPlan(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class TenantStatus(str, enum.Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class Tenant(Base):
    """
    Top-level tenant (school) record.
    This is the root entity - everything hangs off a tenant_id.
    Stored in a separate 'public' schema, not tenant-scoped.
    """
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)  # URL-safe identifier
    name = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=True, unique=True)  # Custom domain
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    website = Column(String(500), nullable=True)

    # Branding
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), default="#4F46E5")    # Indigo
    secondary_color = Column(String(7), default="#10B981")  # Emerald
    branding_config = Column(JSONB, default={})             # Extra branding settings

    # Plan & billing
    plan = Column(Enum(TenantPlan), default=TenantPlan.STARTER, nullable=False)
    status = Column(Enum(TenantStatus), default=TenantStatus.TRIAL, nullable=False)
    trial_ends_at = Column(DateTime, nullable=True)
    max_students = Column(String(10), default="500")  # Plan limit

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    onboarded_at = Column(DateTime, nullable=True)

    settings = relationship("TenantSetting", back_populates="tenant", cascade="all, delete-orphan")
    feature_flags = relationship("FeatureFlag", back_populates="tenant", cascade="all, delete-orphan")


class TenantSetting(Base):
    """Key-value settings per tenant. Flexible configuration without schema changes."""
    __tablename__ = "tenant_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    key = Column(String(100), nullable=False)   # e.g., "academic_year_start_month"
    value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="settings")


class FeatureFlag(Base):
    """
    Per-tenant feature flags for gradual rollouts and plan-based features.
    Examples: ai_copilot, online_payments, parent_portal, sms_notifications
    """
    __tablename__ = "feature_flags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    flag_name = Column(String(100), nullable=False)
    enabled = Column(Boolean, default=False)
    config = Column(JSONB, default={})  # Feature-specific configuration
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="feature_flags")


# Default feature flags assigned on tenant creation
DEFAULT_FEATURE_FLAGS = {
    "parent_portal": True,
    "sms_notifications": False,
    "email_notifications": True,
    "push_notifications": True,
    "online_payments": False,
    "ai_copilot": False,
    "report_cards": True,
    "timetable": True,
    "document_management": True,
}

# Default settings assigned on tenant creation
DEFAULT_SETTINGS = {
    "academic_year_start_month": "6",      # June
    "attendance_threshold_percent": "75",   # Alert below 75%
    "working_days_per_week": "5",
    "grading_scale": "letter",              # letter or percentage
    "currency": "INR",
    "timezone": "Asia/Kolkata",
    "date_format": "DD/MM/YYYY",
    "late_fee_percent": "2",               # 2% per month
}
