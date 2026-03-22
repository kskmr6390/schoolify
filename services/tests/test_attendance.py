"""Attendance service tests."""
import pytest
from httpx import AsyncClient, ASGITransport
from uuid import uuid4

from services.attendance_service.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_mark_attendance_invalid_payload(teacher_token):
    """Missing required fields should return 422."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {teacher_token}", "X-Tenant-Slug": "test-school"},
    ) as client:
        resp = await client.post("/api/v1/attendance", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_mark_attendance_student_role_forbidden(student_token):
    """Students should not be able to mark attendance."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {student_token}", "X-Tenant-Slug": "test-school"},
    ) as client:
        resp = await client.post("/api/v1/attendance", json={
            "class_id": str(uuid4()),
            "date": "2024-03-20",
            "entries": [],
        })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_low_attendance_requires_admin(student_token):
    """Low attendance endpoint should deny students."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {student_token}", "X-Tenant-Slug": "test-school"},
    ) as client:
        resp = await client.get("/api/v1/attendance/low-attendance")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_attendance_unauthorized():
    """No token should return 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/attendance/low-attendance")
    assert resp.status_code == 401
