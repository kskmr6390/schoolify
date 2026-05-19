"""Notification Service - Entry point. Port: 8007"""
import asyncio
from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from ..shared.config import settings
from ..shared.database import create_tables
from ..shared.middleware import LoggingMiddleware, RateLimitMiddleware
from .router import router

# Lazy-import Kafka consumer so a missing/broken Kafka dependency
# never prevents the service (and its DB tables) from starting.
try:
    from .kafka_consumer import start_consumer, stop_consumer
    _KAFKA_AVAILABLE = True
except Exception as _kafka_import_err:
    print(f"Warning: Kafka consumer could not be imported: {_kafka_import_err}. "
          "Event-driven notifications disabled.")
    _KAFKA_AVAILABLE = False
    async def start_consumer(): pass
    async def stop_consumer(): pass


async def _start_consumer_background():
    """Start the Kafka consumer in the background so it never blocks service startup."""
    try:
        await start_consumer()
    except Exception as e:
        print(f"Warning: Kafka consumer failed to start: {e}. Notifications will not be sent.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables first — must succeed before we serve any request.
    await create_tables()
    # Start Kafka consumer asynchronously — a slow/failed Kafka must not block startup.
    if _KAFKA_AVAILABLE:
        asyncio.create_task(_start_consumer_background())
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
