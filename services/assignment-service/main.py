"""Assignment & Exam Service - Entry point. Port: 8008"""
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
    await create_tables()
    try:
        await event_producer.start()
    except Exception as e:
        print(f"Warning: Kafka producer unavailable at startup: {e}. Service will run without event publishing.")
    yield
    await event_producer.stop()

app = FastAPI(title="Schoolify Assignment & Exam Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TenantMiddleware)
app.add_middleware(LoggingMiddleware)
Instrumentator().instrument(app).expose(app)
app.include_router(router)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "assignment-service"}
