import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Import all models so Alembic can detect them
from services.shared.database import Base
from services.shared.config import get_settings

# Auth service models
from services.auth_service.models import User, OAuthAccount, RefreshToken, AuditLog

# Tenant service models
from services.tenant_service.models import Tenant, TenantSetting, FeatureFlag

# User service models
from services.user_service.models import UserProfile, StaffProfile

# Student service models
from services.student_service.models import (
    AcademicYear, Class, Subject, ClassSubject, TimetableSlot,
    Student, Parent, StudentDocument,
)

# Attendance service models
from services.attendance_service.models import AttendanceRecord, AttendanceEntry

# Fee service models
from services.fee_service.models import FeeStructure, Invoice, InvoiceItem, Payment

# Assignment service models
from services.assignment_service.models import (
    Assignment, Submission, Exam, ExamResult,
)

# Notification service models
from services.notification_service.models import Notification, NotificationPreference, DeviceToken

# AI Copilot service models
from services.ai_copilot_service.models import Conversation, Message

# Analytics service models
from services.analytics_service.models import (
    DailyAttendanceSnapshot, MonthlyFeeSnapshot,
    EnrollmentSnapshot, AcademicPerformanceSnapshot,
)

# Alembic config object
config = context.config

# Configure logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

settings = get_settings()


def get_url():
    return settings.DATABASE_URL.replace("+asyncpg", "")  # Use sync driver for migrations


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
