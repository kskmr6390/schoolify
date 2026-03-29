"""AI Copilot models."""
from datetime import datetime
from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text
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
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("copilot_conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)          # user | assistant | system
    content = Column(Text, nullable=False)
    sources = Column(JSONB, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    conversation = relationship("CopilotConversation", back_populates="messages")


class TrainingJob(TenantAwareModel):
    """Persists every training run: config, progress, logs, result."""
    __tablename__ = "training_jobs"

    status = Column(String(20), nullable=False, default="running")   # running|completed|failed
    progress = Column(Integer, nullable=False, default=0)            # 0-100
    phase = Column(String(100), nullable=True)                       # human-readable current step
    model_arch = Column(String(50), nullable=False, default="tinyllama-1.1b")
    data_sources = Column(JSONB, nullable=False, default=list)
    config = Column(JSONB, nullable=True)                            # epochs, lr, batch, etc.
    data_points = Column(Integer, nullable=False, default=0)         # total records indexed
    vectors_indexed = Column(Integer, nullable=False, default=0)     # FAISS vectors written
    logs = Column(JSONB, nullable=False, default=list)               # list[str]
    finished_at = Column(DateTime, nullable=True)
    duration_sec = Column(Integer, nullable=True)
    triggered_by = Column(String(20), nullable=False, default="manual")  # manual|schedule


class LLMUsageLog(TenantAwareModel):
    """Daily aggregated LLM usage per provider — powers the AI analytics dashboard."""
    __tablename__ = "llm_usage_logs"

    log_date     = Column(Date,    nullable=False, index=True)
    provider     = Column(String(20), nullable=False)   # local | claude | google | openai
    model_name   = Column(String(50), nullable=True)    # e.g. tinyllama-1.1b, claude-3-5-sonnet
    query_count  = Column(Integer, nullable=False, default=0)
    tokens_input = Column(Integer, nullable=False, default=0)
    tokens_output = Column(Integer, nullable=False, default=0)
    cost_usd     = Column(Float,   nullable=False, default=0.0)  # $0 for local


class LLMCallLog(TenantAwareModel):
    """Per-call LLM log — powers the pass/fail/error metrics dashboard."""
    __tablename__ = "llm_call_logs"

    user_id         = Column(UUID(as_uuid=True), nullable=True,  index=True)
    conversation_id = Column(UUID(as_uuid=True), nullable=True,  index=True)
    provider        = Column(String(20),         nullable=False, index=True)   # openai|anthropic|google|mistral|groq|cohere|local
    model_name      = Column(String(80),         nullable=True)
    tokens_input    = Column(Integer,            nullable=False, default=0)
    tokens_output   = Column(Integer,            nullable=False, default=0)
    latency_ms      = Column(Integer,            nullable=False, default=0)
    status          = Column(String(10),         nullable=False, default="pass", index=True)  # pass | fail
    error_message   = Column(Text,               nullable=True)
    cost_usd        = Column(Float,              nullable=False, default=0.0)


class TrainingSchedule(TenantAwareModel):
    """One active schedule per tenant — upsert semantics (delete old, insert new)."""
    __tablename__ = "training_schedules"

    freq = Column(String(20), nullable=False, default="manual")  # manual|daily|weekly|monthly
    time_of_day = Column(String(5), nullable=False, default="02:00")  # HH:MM
    day_of_week = Column(Integer, nullable=True)                  # 0=Sun … 6=Sat (weekly only)
    data_sources = Column(JSONB, nullable=False, default=list)
    model_arch = Column(String(50), nullable=False, default="tinyllama-1.1b")
    config = Column(JSONB, nullable=True)                          # same hyperparams as TrainingJob
    is_active = Column(Boolean, nullable=False, default=True)
    next_run_at = Column(DateTime, nullable=True)
    last_run_at = Column(DateTime, nullable=True)
