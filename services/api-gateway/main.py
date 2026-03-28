"""
API Gateway - Single entry point for all client requests.
Port: 8000

Responsibilities:
  1. Route requests to the appropriate microservice
  2. Validate JWT tokens before forwarding (auth bypass protection)
  3. Inject tenant context (X-Tenant-ID) resolved from slug/subdomain
  4. Apply rate limiting per tenant/IP
  5. Aggregate health checks across all services
  6. Provide a single /docs endpoint aggregating service info
"""
import httpx
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator

from ..shared.config import settings
from ..shared.middleware import LoggingMiddleware, RateLimitMiddleware
from ..shared.security import verify_token

# Service registry
SERVICES = {
    "auth":         settings.AUTH_SERVICE_URL,
    "tenant":       settings.TENANT_SERVICE_URL,
    "user":         settings.USER_SERVICE_URL,
    "student":      settings.STUDENT_SERVICE_URL,
    "attendance":   settings.ATTENDANCE_SERVICE_URL,
    "fee":          settings.FEE_SERVICE_URL,
    "notification": settings.NOTIFICATION_SERVICE_URL,
    "assignment":   settings.ASSIGNMENT_SERVICE_URL,
    "analytics":    settings.ANALYTICS_SERVICE_URL,
    "ai-copilot":   settings.AI_COPILOT_SERVICE_URL,
}

# Route prefix → service mapping
ROUTE_MAP = {
    "/api/v1/auth":          "auth",
    "/api/v1/tenants":       "tenant",
    "/api/v1/users":         "user",
    "/api/v1/students":      "student",
    "/api/v1/classes":       "student",
    "/api/v1/subjects":      "student",
    "/api/v1/timetable":     "student",
    "/api/v1/academic-years":"student",
    "/api/v1/parents":       "student",
    "/api/v1/attendance":    "attendance",
    "/api/v1/fees":          "fee",
    "/api/v1/notifications": "notification",
    "/api/v1/assignments":   "assignment",
    "/api/v1/exams":         "assignment",
    "/api/v1/submissions":   "assignment",
    "/api/v1/results":       "assignment",
    "/api/v1/analytics":     "analytics",
    "/api/v1/dashboard":     "analytics",
    "/api/v1/reports":       "analytics",
    "/api/v1/compliance":    "analytics",
    "/api/v1/llm-analytics": "analytics",
    "/api/v1/copilot":       "ai-copilot",
    "/api/v1/feed":          "student",
    "/api/v1/upload":        "student",
}

# Endpoints that don't require authentication
PUBLIC_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/refresh",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/google",
    "/api/v1/tenants/by-slug",
    "/api/v1/tenants/by-domain",
    "/api/v1/tenants/register",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http_client = httpx.AsyncClient(timeout=30.0)
    print("API Gateway started")
    yield
    await app.state.http_client.aclose()
    print("API Gateway stopped")


app = FastAPI(
    title="Schoolify API Gateway",
    description="Entry point for all Schoolify API requests",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(LoggingMiddleware)
Instrumentator().instrument(app).expose(app)


def _resolve_service(path: str) -> Optional[str]:
    """Find which service handles this path prefix."""
    for prefix, service in sorted(ROUTE_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if path.startswith(prefix):
            return service
    return None


def _is_public(path: str) -> bool:
    """Check if the path is a public (unauthenticated) endpoint."""
    for public_path in PUBLIC_PATHS:
        if path.startswith(public_path):
            return True
    return False


async def _get_tenant_id(request: Request) -> Optional[str]:
    """Resolve tenant ID from slug via tenant service cache."""
    tenant_slug = request.headers.get("X-Tenant-Slug")
    if not tenant_slug:
        # Try from subdomain
        host = request.headers.get("host", "")
        parts = host.split(".")
        if len(parts) >= 3 and parts[0] not in {"www", "api", "app"}:
            tenant_slug = parts[0]

    if not tenant_slug:
        return None

    # Check Redis cache
    from ..shared.redis_client import cache_get
    cached = await cache_get(f"tenant:slug:{tenant_slug}")
    if cached:
        return cached.get("id")

    return None


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "api-gateway"}


@app.get("/health/all")
async def health_all(request: Request):
    """Check health of all downstream services."""
    results = {}
    async with httpx.AsyncClient(timeout=5.0) as client:
        for name, url in SERVICES.items():
            try:
                resp = await client.get(f"{url}/health")
                results[name] = {"status": "healthy" if resp.status_code == 200 else "unhealthy"}
            except Exception:
                results[name] = {"status": "unreachable"}
    return {"gateway": "healthy", "services": results}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(request: Request, path: str):
    """
    Universal proxy handler.
    Routes all requests to the appropriate downstream service.
    """
    full_path = f"/{path}"

    # Resolve service
    service_name = _resolve_service(full_path)
    if not service_name:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    service_url = SERVICES.get(service_name)
    if not service_url:
        raise HTTPException(status_code=503, detail="Service unavailable")

    # Auth check for non-public paths
    if not _is_public(full_path):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            token_data = verify_token(auth_header.split(" ", 1)[1])
        except HTTPException:
            raise

    # Resolve tenant ID
    tenant_id = await _get_tenant_id(request)

    # Build forwarded headers
    headers = dict(request.headers)
    headers.pop("host", None)

    if tenant_id:
        headers["X-Tenant-ID"] = tenant_id

    # Forward request to service
    target_url = f"{service_url}{full_path}"
    if request.url.query:
        target_url += f"?{request.url.query}"

    try:
        body = await request.body()
        response = await request.app.state.http_client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body,
        )
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.headers.get("content-type"),
        )
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail=f"Service '{service_name}' is unavailable")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Gateway timeout")
