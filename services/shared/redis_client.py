"""
Redis client utilities for caching, rate limiting, and session management.
"""
import json
from functools import wraps
from typing import Any, Callable, Optional

import redis.asyncio as aioredis

from .config import settings

_redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """Get Redis connection from pool. Call once per service startup."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
        )
    return _redis_pool


async def cache_get(key: str) -> Optional[Any]:
    """Get a cached value, returns None if not found."""
    try:
        redis = await get_redis()
        value = await redis.get(key)
        return json.loads(value) if value else None
    except Exception:
        return None  # Cache miss on error is acceptable


async def cache_set(key: str, value: Any, ttl: int = settings.REDIS_TTL_SECONDS):
    """Set a cached value with TTL."""
    try:
        redis = await get_redis()
        await redis.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass  # Cache write failure is non-fatal


async def cache_delete(key: str):
    """Delete a cached value."""
    try:
        redis = await get_redis()
        await redis.delete(key)
    except Exception:
        pass


async def cache_invalidate_pattern(pattern: str):
    """Delete all keys matching a pattern. Use carefully in production."""
    try:
        redis = await get_redis()
        keys = await redis.keys(pattern)
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass


async def rate_limit_check(
    key: str,
    limit: int,
    window_seconds: int = 60,
) -> tuple[bool, int]:
    """
    Sliding window rate limit check.
    Returns (is_allowed, current_count).
    """
    try:
        redis = await get_redis()
        current = await redis.incr(key)
        if current == 1:
            await redis.expire(key, window_seconds)
        return current <= limit, current
    except Exception:
        return True, 0  # Allow on Redis failure


async def set_with_lock(key: str, value: Any, ttl: int) -> bool:
    """
    Set key only if it doesn't exist (atomic check-and-set).
    Used for idempotency keys and distributed locks.
    Returns True if set, False if already existed.
    """
    try:
        redis = await get_redis()
        result = await redis.set(
            key,
            json.dumps(value, default=str),
            ex=ttl,
            nx=True,  # Only set if not exists
        )
        return result is True
    except Exception:
        return False


async def get_or_set(key: str, factory: Callable, ttl: int = settings.REDIS_TTL_SECONDS):
    """
    Cache-aside pattern helper.
    Returns cached value or calls factory() to compute and cache it.
    """
    cached = await cache_get(key)
    if cached is not None:
        return cached

    value = await factory()
    if value is not None:
        await cache_set(key, value, ttl)
    return value
