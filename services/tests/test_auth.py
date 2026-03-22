"""Auth service tests."""
import pytest
from httpx import AsyncClient, ASGITransport
from uuid import uuid4

from services.auth_service.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_login_missing_fields():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/login", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_login_wrong_credentials():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrong",
            "tenant_slug": "test-school",
        })
    # 401 or 404 depending on whether tenant exists
    assert resp.status_code in (401, 404)


@pytest.mark.asyncio
async def test_register_duplicate_email(db_session, tenant_id, admin_token):
    """Register the same email twice should return 409."""
    from services.auth_service.models import User
    from services.shared.security import hash_password

    # Pre-create user in DB
    user = User(
        tenant_id=tenant_id,
        email="duplicate@test.com",
        password_hash=hash_password("Password@123"),
        role="teacher",
        first_name="Test",
        last_name="User",
    )
    db_session.add(user)
    await db_session.commit()

    # Try to register same email
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"X-Tenant-Slug": "test-school", "Authorization": f"Bearer {admin_token}"},
    ) as client:
        resp = await client.post("/api/v1/auth/register", json={
            "email": "duplicate@test.com",
            "password": "Password@123",
            "first_name": "Another",
            "last_name": "User",
            "role": "teacher",
        })

    assert resp.status_code == 409
    data = resp.json()
    assert data["success"] is False


@pytest.mark.asyncio
async def test_refresh_invalid_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/refresh", json={
            "refresh_token": "invalid-token-that-doesnt-exist"
        })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_unauthorized():
    """GET /me without token should return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401
