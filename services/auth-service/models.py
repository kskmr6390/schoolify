"""
Auth service data models.
User accounts, OAuth, refresh tokens, and audit logs.
"""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from ..shared.database import Base, TenantAwareModel


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"  # Platform-level admin (Schoolify staff)
    ADMIN = "admin"              # School admin
    TEACHER = "teacher"
    STUDENT = "student"
    PARENT = "parent"


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class User(TenantAwareModel):
    __tablename__ = "users"

    email = Column(String(255), nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Null for OAuth-only users
    role = Column(Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.PENDING_VERIFICATION)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    phone = Column(String(20), nullable=True)
    last_login = Column(DateTime, nullable=True)
    email_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime, nullable=True)

    # Relationships
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"


class OAuthProvider(str, enum.Enum):
    GOOGLE = "google"
    MICROSOFT = "microsoft"


class OAuthAccount(Base):
    """Links a user to their OAuth provider accounts."""
    __tablename__ = "oauth_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(Enum(OAuthProvider), nullable=False)
    provider_id = Column(String(255), nullable=False)  # Provider's user ID
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="oauth_accounts")


class RefreshToken(Base):
    """
    Stored refresh tokens for session management.
    We store the HASH, never the plain token.
    This allows session revocation without invalidating the JWT secret.
    """
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    device_info = Column(JSONB, nullable=True)  # User-agent, IP etc.
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="refresh_tokens")


class AuditLog(TenantAwareModel):
    """
    Immutable audit trail for all write operations.
    Critical for compliance (FERPA, GDPR).
    Never deleted - append-only table.
    """
    __tablename__ = "audit_logs"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)   # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    resource = Column(String(100), nullable=False)  # students, users, fees, etc.
    resource_id = Column(UUID(as_uuid=True), nullable=True)
    old_values = Column(JSONB, nullable=True)  # Before state (for UPDATE/DELETE)
    new_values = Column(JSONB, nullable=True)  # After state
    extra_data = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    success = Column(Boolean, default=True)
