"""
Auth Service - Entry point.
Handles: login, registration, token management, OAuth, RBAC.
Port: 8001
"""
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from ..shared.config import settings
from ..shared.database import create_tables
from ..shared.events import event_producer
from ..shared.middleware import LoggingMiddleware, RateLimitMiddleware, TenantMiddleware
from .router import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # Startup
    await create_tables()
    try:
        await event_producer.start()
    except Exception as e:
        print(f"Warning: Kafka producer unavailable at startup: {e}. Service will run without event publishing.")
    print("Auth service started")
    yield
    # Shutdown
    await event_producer.stop()
    print("Auth service stopped")


app = FastAPI(
    title="Schoolify Auth Service",
    description="Authentication, authorization, and user management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS - allow configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware (order matters: first added = outermost)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TenantMiddleware)
app.add_middleware(LoggingMiddleware)

# Prometheus metrics at /metrics
Instrumentator().instrument(app).expose(app)

# Routes
app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "auth-service", "version": "1.0.0"}


@app.get("/ready")
async def ready():
    """Readiness check - verifies DB and Redis connectivity."""
    from ..shared.database import engine
    from ..shared.redis_client import get_redis
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        redis = await get_redis()
        await redis.ping()
        return {"status": "ready"}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=settings.DEBUG)
