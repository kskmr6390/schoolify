"""AI Copilot Service — Port 8010"""
from contextlib import asynccontextmanager

import uvicorn
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import select

from ..shared.config import settings
from ..shared.database import create_tables, AsyncSessionLocal
from ..shared.middleware import LoggingMiddleware, RateLimitMiddleware, TenantMiddleware
from .router import router, _reschedule_tenant

# Global APScheduler instance — imported by router.py
scheduler = AsyncIOScheduler(timezone="UTC")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.AI_COPILOT_ENABLED:
        print("AI Copilot disabled (AI_COPILOT_ENABLED=false). Skipping scheduler and model init.")
        yield
        return

    # 1. Create tables
    await create_tables()

    # 2. Start the scheduler
    scheduler.start()

    # 3. Re-register any active training schedules persisted in DB
    try:
        from .models import TrainingSchedule
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(TrainingSchedule).where(TrainingSchedule.is_active == True)
            )
            schedules = result.scalars().all()
            for s in schedules:
                await _reschedule_tenant(str(s.tenant_id), s)
    except Exception:
        pass  # DB may not be ready yet on first boot

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(title="Schoolify AI Copilot Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TenantMiddleware)
app.add_middleware(LoggingMiddleware)

Instrumentator().instrument(app).expose(app)
app.include_router(router)


@app.get("/health")
async def health():
    if not settings.AI_COPILOT_ENABLED:
        return {"status": "disabled", "service": "ai-copilot-service", "message": "Set AI_COPILOT_ENABLED=true to enable"}
    return {"status": "healthy", "service": "ai-copilot-service"}
