"""Notification service models."""
import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from ..shared.database import Base, TenantAwareModel


class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"


class NotificationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    DELIVERED = "delivered"


class NotificationTemplate(TenantAwareModel):
    __tablename__ = "notification_templates"

    name = Column(String(100), nullable=False)            # e.g., "fee_reminder"
    channel = Column(Enum(NotificationChannel), nullable=False)
    subject = Column(String(255), nullable=True)          # Email subject
    body = Column(Text, nullable=False)                   # Template body with {{variable}}
    variables = Column(JSONB, default=[])                 # List of variable names
    is_active = Column(Boolean, default=True)
    is_system = Column(Boolean, default=False)            # System templates can't be deleted


class Notification(TenantAwareModel):
    __tablename__ = "notifications"

    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    channel = Column(Enum(NotificationChannel), default=NotificationChannel.IN_APP)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    extra_data = Column(JSONB, default={})             # Extra context: invoice_id, etc.
    status = Column(Enum(NotificationStatus), default=NotificationStatus.PENDING)
    error_message = Column(Text, nullable=True)


class NotificationPreference(TenantAwareModel):
    __tablename__ = "notification_preferences"

    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    push_enabled = Column(Boolean, default=True)
    in_app_enabled = Column(Boolean, default=True)
    # JSON: {"fee_reminder": true, "attendance_alert": true, ...}
    event_preferences = Column(JSONB, default={})


class DeviceToken(TenantAwareModel):
    __tablename__ = "device_tokens"

    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    token = Column(String(500), nullable=False)
    platform = Column(String(10), nullable=False)   # ios, android, web
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime, default=datetime.utcnow)


class ChatConversation(TenantAwareModel):
    __tablename__ = "chat_conversations"

    type = Column(String(10), nullable=False, default="direct")   # direct | group
    name = Column(String(200), nullable=True)                     # group chat name
    participants = Column(JSONB, default=[])                      # list of user ID strings
    created_by = Column(UUID(as_uuid=True), nullable=False)


class ChatMessage(TenantAwareModel):
    __tablename__ = "chat_messages"

    conversation_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    sender_id = Column(UUID(as_uuid=True), nullable=False)
    sender_name = Column(String(200), nullable=False)
    text = Column(Text, nullable=False)
    type = Column(String(20), default="text")   # text | system


class Award(TenantAwareModel):
    __tablename__ = "awards"

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="trophy")          # trophy, star, medal, sparkles, etc.
    category = Column(String(100), nullable=True)        # academic, sports, behavior, attendance, art
    recipient_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    recipient_name = Column(String(200), nullable=False)
    recipient_class = Column(String(100), nullable=True)
    awarded_by_id = Column(UUID(as_uuid=True), nullable=False)
    awarded_by_name = Column(String(200), nullable=False)
    shared_to_feed = Column(Boolean, default=True)
