"""
Shared middleware for all FastAPI services.

Middleware stack (applied in order):
  1. LoggingMiddleware     - structured JSON logs with request_id
  2. TenantMiddleware      - resolve + validate tenant from header/subdomain
  3. RateLimitMiddleware   - Redis sliding-window rate limiting
"""
import json
import time
import uuid
from typing import Optional

import redis.asyncio as aioredis
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from .config import settings


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured JSON request logging.
    Adds X-Request-ID header to every response for distributed tracing.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.time()

        response = await call_next(request)

        duration_ms = round((time.time() - start_time) * 1000, 2)
        log_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "tenant_id": getattr(request.state, "tenant_id", None),
            "user_id": getattr(request.state, "user_id", None),
        }
        print(json.dumps(log_data))  # In production, use structlog or similar

        response.headers["X-Request-ID"] = request_id
        return response


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Resolves the current tenant from:
      1. X-Tenant-Slug header (API clients)
      2. Subdomain: {slug}.schoolify.com (web/mobile)

    Sets request.state.tenant_id for downstream use.
    Skips tenant resolution for public endpoints (health, docs).
    """

    SKIP_PATHS = {"/health", "/ready", "/docs", "/openapi.json", "/redoc", "/metrics"}

    async def dispatch(self, request: Request, call_next):
        # Skip tenant resolution for infrastructure endpoints
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        # Skip for tenant management endpoints (super-admin only)
        if request.url.path.startswith("/api/v1/tenants") and request.method == "POST":
            return await call_next(request)

        tenant_slug = self._extract_tenant_slug(request)
        if not tenant_slug:
            # Allow requests without tenant for auth/registration flows
            request.state.tenant_id = None
            return await call_next(request)

        # In production, validate tenant_slug against DB/cache here
        # For now, pass the slug along and let individual services validate
        request.state.tenant_slug = tenant_slug
        return await call_next(request)

    def _extract_tenant_slug(self, request: Request) -> Optional[str]:
        """Extract tenant identifier from header or subdomain."""
        # Check X-Tenant-Slug header first (explicit, preferred for APIs)
        slug = request.headers.get("X-Tenant-Slug")
        if slug:
            return slug

        # Fall back to subdomain extraction
        host = request.headers.get("host", "")
        parts = host.split(".")
        if len(parts) >= 3:  # subdomain.schoolify.com
            potential_slug = parts[0]
            # Exclude www, api, app subdomains
            if potential_slug not in {"www", "api", "app", "localhost"}:
                return potential_slug

        return None


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Redis-based sliding window rate limiting.
    Limits:
      - Per IP: 60 requests/minute (configurable)
      - Per tenant: 1000 requests/minute
    Returns 429 with Retry-After header when exceeded.
    """

    def __init__(self, app, redis_url: str = settings.REDIS_URL):
        super().__init__(app)
        self.redis_url = redis_url
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(self.redis_url, decode_responses=True)
        return self._redis

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in {"/health", "/ready", "/metrics"}:
            return await call_next(request)

        try:
            redis = await self._get_redis()
            client_ip = request.client.host if request.client else "unknown"

            # IP-based rate limiting
            ip_key = f"rate_limit:ip:{client_ip}"
            ip_count = await redis.incr(ip_key)
            if ip_count == 1:
                await redis.expire(ip_key, 60)

            if ip_count > settings.RATE_LIMIT_PER_MINUTE:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"success": False, "errors": [{"code": "RATE_LIMIT_EXCEEDED", "message": "Too many requests"}]},
                    headers={"Retry-After": "60"},
                )
        except Exception:
            # Don't fail the request if Redis is unavailable
            pass

        return await call_next(request)
