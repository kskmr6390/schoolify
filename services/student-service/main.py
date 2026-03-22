"""Student Service - Entry point. Port: 8004"""
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
from .feed_router import router as feed_router
from .upload_router import router as upload_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    await event_producer.start()
    yield
    await event_producer.stop()

app = FastAPI(title="Schoolify Student Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(RateLimitMiddleware)
app.add_middleware(TenantMiddleware)
app.add_middleware(LoggingMiddleware)
Instrumentator().instrument(app).expose(app)
app.include_router(router)
app.include_router(feed_router)
app.include_router(upload_router)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "student-service"}
