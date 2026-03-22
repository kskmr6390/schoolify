"""Notification Service - Entry point. Port: 8007"""
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from ..shared.config import settings
from ..shared.database import create_tables
from ..shared.middleware import LoggingMiddleware, RateLimitMiddleware
from .kafka_consumer import start_consumer, stop_consumer
from .router import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    await start_consumer()
    yield
    await stop_consumer()

app = FastAPI(title="Schoolify Notification Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(RateLimitMiddleware)
app.add_middleware(LoggingMiddleware)
Instrumentator().instrument(app).expose(app)
app.include_router(router)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "notification-service"}
