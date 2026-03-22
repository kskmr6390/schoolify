"""AI Copilot models."""
import uuid
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from ..shared.database import TenantAwareModel

class CopilotConversation(TenantAwareModel):
    __tablename__ = "copilot_conversations"
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    messages = relationship("CopilotMessage", back_populates="conversation", cascade="all, delete-orphan")

class CopilotMessage(TenantAwareModel):
    __tablename__ = "copilot_messages"
    conversation_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    sources = Column(JSONB, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    conversation = relationship("CopilotConversation", back_populates="messages")
