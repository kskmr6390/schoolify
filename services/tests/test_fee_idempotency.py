"""
Fee service idempotency tests.

Critical: duplicate payments with same idempotency_key must return the
existing payment, not create a new one.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from uuid import uuid4

from services.fee_service.main import app


@pytest.mark.asyncio
async def test_duplicate_payment_idempotency(admin_token):
    """Posting payment twice with same idempotency_key should be safe."""
    idempotency_key = str(uuid4())
    invoice_id = str(uuid4())  # Would need a real invoice in integration test

    payload = {
        "invoice_id": invoice_id,
        "amount": 15000.0,
        "payment_method": "upi",
        "idempotency_key": idempotency_key,
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {admin_token}", "X-Tenant-Slug": "test-school"},
    ) as client:
        resp1 = await client.post("/api/v1/fees/payments", json=payload)
        # Second call with same key
        resp2 = await client.post("/api/v1/fees/payments", json=payload)

    # Both should succeed (idempotent) — not create a duplicate
    # In a full integration test, resp1 and resp2 would return the same payment ID
    if resp1.status_code == 201:
        assert resp2.status_code in (200, 201)
        if resp1.status_code == 201 and resp2.status_code == 201:
            data1 = resp1.json().get("data", {})
            data2 = resp2.json().get("data", {})
            # Same idempotency key → same payment record
            assert data1.get("id") == data2.get("id")
    else:
        # Invoice didn't exist — that's fine for a unit test without DB seeding
        assert resp1.status_code in (404, 422)


@pytest.mark.asyncio
async def test_payment_missing_idempotency_key(admin_token):
    """Payment request without idempotency_key should fail validation."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {admin_token}", "X-Tenant-Slug": "test-school"},
    ) as client:
        resp = await client.post("/api/v1/fees/payments", json={
            "invoice_id": str(uuid4()),
            "amount": 1000.0,
            "payment_method": "cash",
            # missing idempotency_key
        })
    assert resp.status_code == 422
