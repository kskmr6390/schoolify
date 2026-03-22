"""
Shared test fixtures for all Schoolify backend services.

Uses a real PostgreSQL database (not mocked) to catch ORM/migration divergence.
The DATABASE_URL should point to a dedicated test database.
"""
import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from uuid import uuid4

from services.shared.database import Base, get_db
from services.shared.security import create_access_token
from services.shared.config import get_settings

settings = get_settings()

TEST_DATABASE_URL = settings.DATABASE_URL.replace(
    "/schoolify", "/schoolify_test"
)

# ── Engine & Session ─────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


# ── Tenant & User Fixtures ────────────────────────────────────────────────────

@pytest.fixture
def tenant_id():
    return uuid4()


@pytest.fixture
def admin_token(tenant_id):
    return create_access_token(
        data={
            "sub": str(uuid4()),
            "tenant_id": str(tenant_id),
            "role": "admin",
        }
    )


@pytest.fixture
def teacher_token(tenant_id):
    return create_access_token(
        data={
            "sub": str(uuid4()),
            "tenant_id": str(tenant_id),
            "role": "teacher",
        }
    )


@pytest.fixture
def student_token(tenant_id):
    return create_access_token(
        data={
            "sub": str(uuid4()),
            "tenant_id": str(tenant_id),
            "role": "student",
        }
    )


# ── HTTP Client Factories ────────────────────────────────────────────────────

def make_client(app, token: str, tenant_slug: str = "test-school"):
    """Create an AsyncClient for the given ASGI app with auth headers."""
    return AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Tenant-Slug": tenant_slug,
        },
    )
