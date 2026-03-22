"""
Database configuration with multi-tenant support.

Architecture decision: Row-level multi-tenancy via tenant_id on every table.
Chosen over schema-per-tenant because:
  - Simpler connection pooling (single pool shared across tenants)
  - Easier migrations (one migration applies to all tenants)
  - Lower operational overhead at scale (1000s of schemas = maintenance nightmare)
  - PostgreSQL RLS can be added on top for extra isolation if needed

We use asyncpg for async I/O, critical for FastAPI's async request handlers.
"""
import uuid
from datetime import datetime
from typing import AsyncGenerator

from sqlalchemy import Column, DateTime, event
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

# Production-grade connection pool:
# pool_size=20 handles 20 concurrent DB connections per service instance
# max_overflow=40 allows burst to 60 total connections
# pool_pre_ping=True validates connections before use (handles stale connections)
# pool_recycle=3600 recycles connections hourly to prevent PostgreSQL timeouts
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=3600,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Keep objects accessible after commit
)

Base = declarative_base()


class TenantAwareModel(Base):
    """
    Abstract base model providing tenant isolation and audit fields.
    ALL business entities must inherit from this, not Base directly.
    This ensures every table has tenant_id enforced at the ORM level.
    """
    __abstract__ = True

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
        comment="Primary key - UUID v4 for distributed safety"
    )
    tenant_id = Column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="Tenant identifier for row-level isolation"
    )
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a managed async DB session.
    Commits on success, rolls back on any exception.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    """Create all tables. Called at service startup in development."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
