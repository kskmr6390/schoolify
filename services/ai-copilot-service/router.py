"""AI Copilot service router."""
import uuid as uuid_lib
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.config import settings
from ..shared.database import get_db
from ..shared.redis_client import get_redis
from ..shared.schemas import StandardResponse
from ..shared.security import get_current_user, require_roles
from .models import CopilotConversation, CopilotMessage, LLMCallLog, TrainingJob, TrainingSchedule
from .rag import rag_pipeline, get_store

router = APIRouter(prefix="/api/v1/copilot", tags=["AI Copilot"])

# ── Ollama model name mapping ────────────────────────────────────────────────

ARCH_TO_OLLAMA = {
    "tinyllama-1.1b": "tinyllama",
    "phi-2":          "phi",
    "phi-3-mini":     "phi3",
    "llama-3.2-3b":   "llama3.2:3b",
    "mistral-7b":     "mistral",
}

# ── Request / Response models ────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[UUID] = None
    provider: str = "anthropic"           # openai|anthropic|google|mistral|groq|cohere|local
    model: Optional[str] = None           # provider-specific model id
    api_key: Optional[str] = None         # user-supplied key (not stored)


class ChatResponse(BaseModel):
    conversation_id: UUID
    message_id: UUID
    response: str
    sources: List[dict] = []


class ConversationResponse(BaseModel):
    id: UUID
    title: str
    created_at: datetime
    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: UUID
    role: str
    content: str
    sources: Optional[List[dict]]
    created_at: datetime
    model_config = {"from_attributes": True}


class SaveAPIKeyRequest(BaseModel):
    provider: str
    api_key: str


class TrainConfig(BaseModel):
    epochs: int = 8
    learning_rate: float = 0.0001
    batch_size: int = 16
    max_seq_len: int = 512
    model_size: str = "small"
    chunk_size: int = 512
    overlap: int = 50
    top_k: int = 5
    threshold: float = 0.65


class TrainRequest(BaseModel):
    data_sources: List[str] = ["students", "attendance", "fees", "academics"]
    model_arch: str = "tinyllama-1.1b"
    config: TrainConfig = TrainConfig()


class ScheduleRequest(BaseModel):
    freq: str = "manual"           # manual | daily | weekly | monthly
    time_of_day: str = "02:00"     # HH:MM
    day_of_week: Optional[int] = None  # 0=Sun…6=Sat
    data_sources: List[str] = ["students", "attendance", "fees", "academics"]
    model_arch: str = "tinyllama-1.1b"
    config: TrainConfig = TrainConfig()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _next_run(freq: str, time_of_day: str, day_of_week: Optional[int]) -> Optional[datetime]:
    """Compute the next scheduled datetime from now."""
    if freq == "manual":
        return None
    h, m = map(int, time_of_day.split(":"))
    now = datetime.utcnow()
    candidate = now.replace(hour=h, minute=m, second=0, microsecond=0)
    if freq == "daily":
        if candidate <= now:
            candidate += timedelta(days=1)
    elif freq == "weekly":
        dow = day_of_week or 1  # default Monday
        days_ahead = (dow - candidate.weekday() - 1) % 7 + 1  # at least 1 day ahead
        candidate += timedelta(days=days_ahead)
        candidate = candidate.replace(hour=h, minute=m, second=0, microsecond=0)
    elif freq == "monthly":
        if candidate <= now:
            # first of next month
            if candidate.month == 12:
                candidate = candidate.replace(year=candidate.year + 1, month=1, day=1)
            else:
                candidate = candidate.replace(month=candidate.month + 1, day=1)
    return candidate


def _ollama_model_name(arch: str) -> str:
    return ARCH_TO_OLLAMA.get(arch, arch)


async def _is_model_present(arch: str) -> bool:
    """Return True if the Ollama model for arch is already downloaded."""
    model = _ollama_model_name(arch)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{settings.LOCAL_LLM_BASE_URL}/api/tags")
            if resp.status_code == 200:
                existing = [m["name"] for m in resp.json().get("models", [])]
                return any(m.startswith(model.split(":")[0]) for m in existing)
    except Exception:
        pass
    return False


async def _ensure_ollama_model(arch: str) -> bool:
    """Check if model is in Ollama; trigger pull (blocking) if not. Returns True if already present."""
    if await _is_model_present(arch):
        return True
    model = _ollama_model_name(arch)
    try:
        # stream=False makes Ollama block until the pull is complete
        async with httpx.AsyncClient(timeout=600) as client:
            await client.post(
                f"{settings.LOCAL_LLM_BASE_URL}/api/pull",
                json={"name": model, "stream": False},
                timeout=600,
            )
    except Exception:
        pass
    return False


async def _list_ollama_models() -> list:
    """Return all models currently in Ollama."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{settings.LOCAL_LLM_BASE_URL}/api/tags")
            if resp.status_code == 200:
                return resp.json().get("models", [])
    except Exception:
        pass
    return []


async def _delete_ollama_model(arch: str) -> bool:
    """Delete an Ollama model. Returns True on success."""
    model = _ollama_model_name(arch)
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.delete(
                f"{settings.LOCAL_LLM_BASE_URL}/api/delete",
                json={"name": model},
            )
            return resp.status_code in (200, 204)
    except Exception:
        pass
    return False


async def _get_tenant_active_model(tenant_id: str, db: AsyncSession) -> str:
    """Return model_arch from tenant's most recent completed TrainingJob, or settings default."""
    from uuid import UUID as UUIDT
    try:
        result = await db.execute(
            select(TrainingJob)
            .where(and_(
                TrainingJob.tenant_id == UUIDT(tenant_id),
                TrainingJob.status == "completed",
            ))
            .order_by(TrainingJob.created_at.desc())
            .limit(1)
        )
        job = result.scalar_one_or_none()
        if job:
            return job.model_arch
    except Exception:
        pass
    return settings.LOCAL_LLM_MODEL


async def _fetch_tenant_data(tenant_id: str, sources: List[str], db: AsyncSession) -> dict:
    """Fetch real school data from DB for the selected sources. Skips missing tables gracefully."""
    data: dict[str, list] = {}
    tid = tenant_id
    table_queries = {
        "students": f"""
            SELECT s.first_name, s.last_name, s.roll_number,
                   c.name AS class_name, s.gender, s.date_of_birth
            FROM students s LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.tenant_id = '{tid}' LIMIT 500""",
        "attendance": f"""
            SELECT a.date, a.status,
                   s.first_name || ' ' || s.last_name AS student_name,
                   c.name AS class_name
            FROM attendance_records a
            JOIN students s ON a.student_id = s.id
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE a.tenant_id = '{tid}' ORDER BY a.date DESC LIMIT 1000""",
        "fees": f"""
            SELECT f.amount, f.status, f.due_date, f.paid_date, f.fee_type,
                   s.first_name || ' ' || s.last_name AS student_name
            FROM fee_records f JOIN students s ON f.student_id = s.id
            WHERE f.tenant_id = '{tid}' LIMIT 500""",
        "academics": f"""
            SELECT e.name AS exam_name, er.marks_obtained, er.max_marks,
                   er.grade, sub.name AS subject_name,
                   s.first_name || ' ' || s.last_name AS student_name
            FROM exam_results er
            JOIN exams e ON er.exam_id = e.id
            JOIN subjects sub ON er.subject_id = sub.id
            JOIN students s ON er.student_id = s.id
            WHERE er.tenant_id = '{tid}' LIMIT 500""",
        "staff": f"""
            SELECT u.full_name, u.email, u.role
            FROM users u
            WHERE u.tenant_id = '{tid}' AND u.role IN ('teacher', 'admin') LIMIT 200""",
        "announcements": f"""
            SELECT title, body, created_at FROM announcements
            WHERE tenant_id = '{tid}' ORDER BY created_at DESC LIMIT 100""",
        "timetable": f"""
            SELECT sub.name AS subject, u.full_name AS teacher,
                   c.name AS class_name, t.day_of_week, t.start_time, t.end_time
            FROM timetable_entries t
            JOIN subjects sub ON t.subject_id = sub.id
            JOIN users u ON t.teacher_id = u.id
            JOIN classes c ON t.class_id = c.id
            WHERE t.tenant_id = '{tid}' LIMIT 300""",
    }
    for source in sources:
        query = table_queries.get(source)
        if not query:
            continue
        try:
            result = await db.execute(text(query))
            rows = result.mappings().all()
            data[source] = [dict(row) for row in rows]
        except Exception:
            data[source] = []
    return data


def _data_to_documents(source: str, records: list) -> list:
    docs = []
    for rec in records:
        parts = [f"{k.replace('_', ' ')}: {v}" for k, v in rec.items() if v is not None]
        content = ", ".join(parts)
        if len(content) < 10:
            continue
        docs.append({
            "content": content,
            "source_type": source,
            "source_id": str(rec.get("id", uuid_lib.uuid4())),
            "metadata": rec,
        })
    return docs


async def _run_training(
    job_id: str,
    tenant_id: str,
    sources: List[str],
    arch: str,
    cfg: TrainConfig,
    triggered_by: str = "manual",
):
    """
    Background task: fetch data → index into FAISS → persist all logs + status to DB.
    """
    from ..shared.database import AsyncSessionLocal

    def ts() -> str:
        return datetime.now().strftime("%H:%M:%S")

    async def _update_db(progress: int, phase: str, logs: list, **extra):
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(TrainingJob).where(TrainingJob.id == uuid_lib.UUID(job_id))
                )
                job_row = result.scalar_one_or_none()
                if job_row:
                    job_row.progress = progress
                    job_row.phase = phase
                    job_row.logs = logs
                    for k, v in extra.items():
                        setattr(job_row, k, v)
                    await db.commit()
        except Exception:
            pass  # never crash the training task over a DB write error

    logs: list[str] = [f"[{ts()}] Training started for {arch}..."]
    await _update_db(0, "Starting", logs)

    try:
        # ── Step 1: Ollama model check ──
        logs.append(f"[{ts()}] Checking Ollama for model: {ARCH_TO_OLLAMA.get(arch, arch)}...")
        await _update_db(5, "Checking model", logs)
        model_ready = await _ensure_ollama_model(arch)
        if model_ready:
            logs.append(f"[{ts()}] Model already available in Ollama.")
        else:
            logs.append(f"[{ts()}] Model pull triggered — indexing will proceed while it downloads.")
        await _update_db(10, "Model check done", logs)

        # ── Step 2: Fetch data ──
        logs.append(f"[{ts()}] Fetching school data for sources: {', '.join(sources)}...")
        await _update_db(15, "Fetching data", logs)
        async with AsyncSessionLocal() as db:
            tenant_data = await _fetch_tenant_data(tenant_id, sources, db)

        total_records = sum(len(v) for v in tenant_data.values())
        logs.append(f"[{ts()}] Fetched {total_records} records across {len(tenant_data)} sources.")
        await _update_db(25, "Data fetched", logs, data_points=total_records)

        # ── Step 3: Apply RAG config ──
        logs.append(f"[{ts()}] Config — epochs={cfg.epochs}, lr={cfg.learning_rate}, "
                    f"batch={cfg.batch_size}, max_seq={cfg.max_seq_len}, "
                    f"chunk={cfg.chunk_size}, overlap={cfg.overlap}")
        await _update_db(30, "Applying config", logs)

        # ── Step 4: Clear old index ──
        logs.append(f"[{ts()}] Clearing existing FAISS index for tenant...")
        store = get_store(tenant_id)
        store.clear()
        await _update_db(35, "Index cleared", logs)

        # ── Step 5: Index each source ──
        total_vectors = 0
        source_count = max(len([s for s, r in tenant_data.items() if r]), 1)
        done = 0
        for source, records in tenant_data.items():
            if not records:
                logs.append(f"[{ts()}]   [{source}] No records — skipped.")
                await _update_db(35 + int(done / source_count * 55), "Indexing", logs)
                continue
            docs = _data_to_documents(source, records)
            if not docs:
                logs.append(f"[{ts()}]   [{source}] No indexable documents — skipped.")
                continue
            logs.append(f"[{ts()}]   [{source}] Embedding {len(docs)} documents...")
            await _update_db(35 + int(done / source_count * 55), "Indexing", logs)
            store.add_documents(docs)
            total_vectors += len(docs)
            done += 1
            logs.append(f"[{ts()}]   [{source}] Done. ({len(docs)} vectors)")
            await _update_db(35 + int(done / source_count * 55), "Indexing", logs, vectors_indexed=total_vectors)

        # ── Step 6: Final model check ──
        logs.append(f"[{ts()}] Verifying Ollama model availability...")
        await _update_db(95, "Finalising", logs)
        final_ready = await _ensure_ollama_model(arch)
        if final_ready:
            logs.append(f"[{ts()}] Model '{ARCH_TO_OLLAMA.get(arch, arch)}' confirmed ready.")
        else:
            logs.append(f"[{ts()}] Model still downloading — AI Copilot will work once it completes.")

        logs.append(f"[{ts()}] Training completed. {total_vectors} vectors indexed.")
        now = datetime.utcnow()

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(TrainingJob).where(TrainingJob.id == uuid_lib.UUID(job_id))
            )
            job_row = result.scalar_one_or_none()
            if job_row:
                start_time = job_row.created_at
                duration = int((now - start_time).total_seconds())
                job_row.status = "completed"
                job_row.progress = 100
                job_row.phase = "Done"
                job_row.logs = logs
                job_row.vectors_indexed = total_vectors
                job_row.finished_at = now
                job_row.duration_sec = duration
                await db.commit()

            # Update schedule last_run_at if triggered by scheduler
            if triggered_by == "schedule":
                sched = await db.execute(
                    select(TrainingSchedule).where(
                        and_(TrainingSchedule.tenant_id == uuid_lib.UUID(tenant_id),
                             TrainingSchedule.is_active == True)
                    )
                )
                sched_row = sched.scalar_one_or_none()
                if sched_row:
                    sched_row.last_run_at = now
                    sched_row.next_run_at = _next_run(
                        sched_row.freq, sched_row.time_of_day, sched_row.day_of_week
                    )
                    await db.commit()

    except Exception as e:
        logs.append(f"[{ts()}] Training failed: {e}")
        now = datetime.utcnow()
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(TrainingJob).where(TrainingJob.id == uuid_lib.UUID(job_id))
            )
            job_row = result.scalar_one_or_none()
            if job_row:
                job_row.status = "failed"
                job_row.phase = "Failed"
                job_row.logs = logs
                job_row.finished_at = now
                await db.commit()


# ── Scheduler ────────────────────────────────────────────────────────────────

_scheduler_started = False


def get_scheduler():
    """Return the global APScheduler instance (created in main.py lifespan)."""
    from .main import scheduler
    return scheduler


async def _reschedule_tenant(tenant_id: str, sched_row: "TrainingSchedule"):
    """Register or replace an APScheduler job for this tenant's training schedule."""
    from .main import scheduler

    job_id_str = f"train_{tenant_id}"
    try:
        scheduler.remove_job(job_id_str)
    except Exception:
        pass

    if sched_row.freq == "manual" or not sched_row.is_active:
        return

    from apscheduler.triggers.cron import CronTrigger

    h, m = map(int, sched_row.time_of_day.split(":"))

    if sched_row.freq == "daily":
        trigger = CronTrigger(hour=h, minute=m)
    elif sched_row.freq == "weekly":
        # APScheduler day_of_week: 0=Mon…6=Sun, UI: 0=Sun…6=Sat
        dow_map = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}
        dow = dow_map.get(sched_row.day_of_week or 1, 0)
        trigger = CronTrigger(day_of_week=dow, hour=h, minute=m)
    elif sched_row.freq == "monthly":
        trigger = CronTrigger(day=1, hour=h, minute=m)
    else:
        return

    data_sources = sched_row.data_sources or []
    arch = sched_row.model_arch or "tinyllama-1.1b"
    cfg_dict = sched_row.config or {}
    cfg = TrainConfig(**{k: v for k, v in cfg_dict.items() if k in TrainConfig.model_fields})

    async def _scheduled_train():
        from ..shared.database import AsyncSessionLocal
        job_id = str(uuid_lib.uuid4())
        tid_uuid = uuid_lib.UUID(tenant_id)
        async with AsyncSessionLocal() as db:
            job_row = TrainingJob(
                id=uuid_lib.UUID(job_id),
                tenant_id=tid_uuid,
                status="running",
                progress=0,
                phase="Starting",
                model_arch=arch,
                data_sources=data_sources,
                config=cfg.model_dump(),
                triggered_by="schedule",
            )
            db.add(job_row)
            await db.commit()
        await _run_training(job_id, tenant_id, data_sources, arch, cfg, triggered_by="schedule")

    scheduler.add_job(
        _scheduled_train,
        trigger=trigger,
        id=job_id_str,
        replace_existing=True,
        name=f"AI training for tenant {tenant_id}",
    )


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/config/api-key", response_model=StandardResponse[dict])
async def save_api_key(
    body: SaveAPIKeyRequest,
    current_user=Depends(require_roles("admin")),
):
    """
    Persist a provider API key server-side (Redis) for this tenant.
    Called from Settings → AI & LLM when the user saves their key.
    The chat endpoint automatically falls back to this cached key when
    the client doesn't send an explicit api_key in the request.
    """
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    redis_key = f"tenant:{tid}:ai_key:{body.provider}"
    try:
        r = await get_redis()
        await r.set(redis_key, body.api_key.strip())
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Failed to cache API key: {exc}")
    return StandardResponse.ok({"saved": True, "provider": body.provider})


@router.post("/chat", response_model=StandardResponse[ChatResponse])
async def chat(
    body: ChatRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import time
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    uid = UUIDT(current_user.user_id)

    if body.conversation_id:
        result = await db.execute(
            select(CopilotConversation).where(
                and_(CopilotConversation.id == body.conversation_id,
                     CopilotConversation.tenant_id == tid)
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = CopilotConversation(tenant_id=tid, user_id=uid, title=body.message[:100])
        db.add(conversation)
        await db.flush()

    history_result = await db.execute(
        select(CopilotMessage)
        .where(CopilotMessage.conversation_id == conversation.id)
        .order_by(CopilotMessage.created_at).limit(20)
    )
    history = [{"role": m.role, "content": m.content} for m in history_result.scalars().all()]

    # Determine model — for local use Ollama name, else use user-supplied or default
    if body.provider == "local":
        active_arch = await _get_tenant_active_model(str(tid), db)
        resolved_model = _ollama_model_name(body.model or active_arch)
    else:
        resolved_model = body.model

    # ── API key resolution ──────────────────────────────────────────────────
    # 1. Use key sent in this request (client-side store)
    # 2. Fall back to tenant-cached key in Redis (saved via /copilot/config/api-key)
    # 3. Fall back to server-side env var (ANTHROPIC_API_KEY etc.)
    redis_key = f"tenant:{tid}:ai_key:{body.provider}"
    resolved_api_key = body.api_key
    if resolved_api_key:
        # Cache the key so future requests without an explicit key still work
        try:
            r = await get_redis()
            await r.set(redis_key, resolved_api_key)  # no TTL — persists until overwritten
        except Exception:
            pass  # Redis failure is non-fatal
    else:
        # Look up cached key
        try:
            r = await get_redis()
            resolved_api_key = await r.get(redis_key) or None
        except Exception:
            pass

    t0 = time.time()
    call_status = "pass"
    error_msg = None
    result_data: dict = {}
    try:
        result_data = await rag_pipeline.answer_question(
            tenant_id=str(tid),
            query=body.message,
            conversation_history=history,
            model=resolved_model,
            provider=body.provider,
            api_key=resolved_api_key,
        )
    except Exception as exc:
        call_status = "fail"
        error_msg = str(exc)
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}") from exc
    finally:
        latency_ms = int((time.time() - t0) * 1000)
        from .rag import PROVIDER_COSTS
        tok_in  = result_data.get("tokens_input",  0) if result_data else 0
        tok_out = result_data.get("tokens_output", 0) if result_data else 0
        cost    = (tok_in + tok_out) / 1000 * PROVIDER_COSTS.get(body.provider, 0.0)
        db.add(LLMCallLog(
            tenant_id=tid,
            user_id=uid,
            conversation_id=conversation.id,
            provider=body.provider,
            model_name=resolved_model,
            tokens_input=tok_in,
            tokens_output=tok_out,
            latency_ms=latency_ms,
            status=call_status,
            error_message=error_msg,
            cost_usd=cost,
        ))

    db.add(CopilotMessage(tenant_id=tid, conversation_id=conversation.id,
                          role="user", content=body.message))
    await db.flush()
    assistant_msg = CopilotMessage(
        tenant_id=tid, conversation_id=conversation.id,
        role="assistant", content=result_data["response"], sources=result_data["sources"],
    )
    db.add(assistant_msg)
    await db.flush()

    return StandardResponse.ok(ChatResponse(
        conversation_id=conversation.id,
        message_id=assistant_msg.id,
        response=result_data["response"],
        sources=result_data["sources"],
    ))


# ── Conversation History ──────────────────────────────────────────────────────

@router.get("/conversations", response_model=StandardResponse[list])
async def list_conversations(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List recent conversations for the current user."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    uid = UUIDT(current_user.user_id)
    result = await db.execute(
        select(CopilotConversation)
        .where(and_(CopilotConversation.tenant_id == tid,
                    CopilotConversation.user_id == uid,
                    CopilotConversation.is_active == True))
        .order_by(CopilotConversation.created_at.desc())
        .limit(30)
    )
    convs = result.scalars().all()
    return StandardResponse.ok([
        {"id": str(c.id), "title": c.title, "created_at": c.created_at.isoformat()}
        for c in convs
    ])


@router.get("/conversations/{conversation_id}/messages", response_model=StandardResponse[list])
async def get_conversation_messages(
    conversation_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all messages for a conversation (most recent first, capped at 100)."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(
        select(CopilotConversation).where(
            and_(CopilotConversation.id == conversation_id,
                 CopilotConversation.tenant_id == tid)
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = await db.execute(
        select(CopilotMessage)
        .where(CopilotMessage.conversation_id == conversation_id)
        .order_by(CopilotMessage.created_at)
        .limit(100)
    )
    return StandardResponse.ok([
        {"id": str(m.id), "role": m.role, "content": m.content,
         "sources": m.sources or [], "created_at": m.created_at.isoformat()}
        for m in msgs.scalars().all()
    ])


@router.delete("/conversations/{conversation_id}", response_model=StandardResponse[dict])
async def delete_conversation(
    conversation_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(
        select(CopilotConversation).where(
            and_(CopilotConversation.id == conversation_id,
                 CopilotConversation.tenant_id == tid)
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conv.is_active = False
    return StandardResponse.ok({"message": "Conversation deleted"})


# ── LLM Metrics ──────────────────────────────────────────────────────────────

@router.get("/metrics", response_model=StandardResponse[dict])
async def get_llm_metrics(
    days: int = 30,
    current_user=Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    """Return pass/fail/error metrics for LLM calls in this tenant."""
    from uuid import UUID as UUIDT
    from datetime import date
    from sqlalchemy import func, case
    tid = UUIDT(current_user.tenant_id)
    since = datetime.utcnow() - timedelta(days=days)

    rows = await db.execute(
        select(LLMCallLog)
        .where(and_(LLMCallLog.tenant_id == tid, LLMCallLog.created_at >= since))
    )
    logs = rows.scalars().all()

    total = len(logs)
    passed = sum(1 for l in logs if l.status == "pass")
    failed = total - passed
    pass_rate = round(passed / total * 100, 1) if total else 0
    avg_latency = round(sum(l.latency_ms for l in logs) / total) if total else 0
    total_cost = round(sum(l.cost_usd for l in logs), 4)
    total_tokens = sum(l.tokens_input + l.tokens_output for l in logs)

    by_provider: dict = {}
    for l in logs:
        p = l.provider
        if p not in by_provider:
            by_provider[p] = {"total": 0, "pass": 0, "fail": 0, "tokens": 0, "cost": 0.0}
        by_provider[p]["total"] += 1
        by_provider[p]["pass" if l.status == "pass" else "fail"] += 1
        by_provider[p]["tokens"] += l.tokens_input + l.tokens_output
        by_provider[p]["cost"] += l.cost_usd

    recent_errors = [
        {"provider": l.provider, "model": l.model_name,
         "error": l.error_message, "at": l.created_at.isoformat()}
        for l in sorted(logs, key=lambda x: x.created_at, reverse=True)
        if l.status == "fail" and l.error_message
    ][:10]

    # Daily chart data (last 30 days)
    daily: dict = {}
    for l in logs:
        day = l.created_at.strftime("%Y-%m-%d")
        if day not in daily:
            daily[day] = {"pass": 0, "fail": 0}
        daily[day]["pass" if l.status == "pass" else "fail"] += 1

    return StandardResponse.ok({
        "total": total,
        "passed": passed,
        "failed": failed,
        "pass_rate": pass_rate,
        "avg_latency_ms": avg_latency,
        "total_cost_usd": total_cost,
        "total_tokens": total_tokens,
        "by_provider": by_provider,
        "recent_errors": recent_errors,
        "daily": daily,
        "period_days": days,
    })


# ── System Check (for local LLM installer wizard) ────────────────────────────

@router.get("/system/check", response_model=StandardResponse[dict])
async def system_check(current_user=Depends(get_current_user)):
    """Return server hardware info to help user select a local model."""
    import platform
    import shutil
    import subprocess

    def _ram_gb() -> float:
        try:
            import psutil
            return round(psutil.virtual_memory().total / (1024 ** 3), 1)
        except Exception:
            return 0.0

    def _disk_gb() -> float:
        try:
            import psutil
            return round(psutil.disk_usage("/").free / (1024 ** 3), 1)
        except Exception:
            return 0.0

    def _cpu_cores() -> int:
        try:
            import os
            return os.cpu_count() or 0
        except Exception:
            return 0

    ram_gb   = _ram_gb()
    disk_gb  = _disk_gb()
    cpu_cores = _cpu_cores()
    os_name  = platform.system()

    # Determine compatible models
    compatible = []
    if ram_gb >= 4 and disk_gb >= 2:
        compatible.append("tinyllama-1.1b")
    if ram_gb >= 6 and disk_gb >= 3:
        compatible.append("phi-2")
    if ram_gb >= 8 and disk_gb >= 4:
        compatible.extend(["phi-3-mini", "llama-3.2-3b"])
    if ram_gb >= 16 and disk_gb >= 6:
        compatible.append("mistral-7b")

    # Check if Ollama is already reachable
    ollama_ok = False
    ollama_version = None
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{settings.LOCAL_LLM_BASE_URL}/api/tags")
            ollama_ok = resp.status_code == 200
            if ollama_ok:
                # try to get version
                vresp = await client.get(f"{settings.LOCAL_LLM_BASE_URL}/api/version")
                if vresp.status_code == 200:
                    ollama_version = vresp.json().get("version")
    except Exception:
        pass

    return StandardResponse.ok({
        "ram_gb":        ram_gb,
        "disk_free_gb":  disk_gb,
        "cpu_cores":     cpu_cores,
        "os":            os_name,
        "compatible_models": compatible,
        "ollama_reachable":  ollama_ok,
        "ollama_version":    ollama_version,
        "ollama_url":        settings.LOCAL_LLM_BASE_URL,
    })


@router.post("/system/pull-model", response_model=StandardResponse[dict])
async def pull_model_bg(
    body: dict,
    background_tasks: BackgroundTasks,
    current_user=Depends(require_roles("admin")),
):
    """Trigger an async Ollama model pull. Frontend polls /model/status to track."""
    arch = body.get("arch", "tinyllama-1.1b")
    background_tasks.add_task(_ensure_ollama_model, arch)
    return StandardResponse.ok({"message": f"Pull started for {arch}", "arch": arch})


@router.post("/train", response_model=StandardResponse[dict])
async def start_training(
    body: TrainRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Kick off a real RAG training run:
    - Persists a TrainingJob row immediately (so you can poll it)
    - Fetches live school data from DB for selected sources
    - Embeds + indexes into tenant's FAISS store
    - Logs every step back to the DB row
    """
    from uuid import UUID as UUIDT
    tenant_id = str(current_user.tenant_id)
    tid = UUIDT(tenant_id)
    job_id = str(uuid_lib.uuid4())

    job_row = TrainingJob(
        id=uuid_lib.UUID(job_id),
        tenant_id=tid,
        status="running",
        progress=0,
        phase="Starting",
        model_arch=body.model_arch,
        data_sources=body.data_sources,
        config=body.config.model_dump(),
        triggered_by="manual",
    )
    db.add(job_row)
    await db.commit()

    background_tasks.add_task(
        _run_training, job_id, tenant_id, body.data_sources, body.model_arch, body.config
    )
    return StandardResponse.ok({"job_id": job_id, "message": "Training started"})


@router.get("/train", response_model=StandardResponse[list])
async def list_training_jobs(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the 20 most recent training jobs for this tenant."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(
        select(TrainingJob)
        .where(TrainingJob.tenant_id == tid)
        .order_by(TrainingJob.created_at.desc())
        .limit(20)
    )
    jobs = result.scalars().all()
    return StandardResponse.ok([
        {
            "id":             str(j.id),
            "status":         j.status,
            "progress":       j.progress,
            "phase":          j.phase,
            "model_arch":     j.model_arch,
            "data_sources":   j.data_sources,
            "config":         j.config,
            "data_points":    j.data_points,
            "vectors_indexed":j.vectors_indexed,
            "triggered_by":   j.triggered_by,
            "started_at":     j.created_at.isoformat(),
            "finished_at":    j.finished_at.isoformat() if j.finished_at else None,
            "duration_sec":   j.duration_sec,
            "logs":           j.logs or [],
        }
        for j in jobs
    ])


@router.get("/train/{job_id}", response_model=StandardResponse[dict])
async def get_training_job(
    job_id: str,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Poll a single training job (used by the UI while training is running)."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    try:
        jid = uuid_lib.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job_id")

    result = await db.execute(
        select(TrainingJob).where(
            and_(TrainingJob.id == jid, TrainingJob.tenant_id == tid)
        )
    )
    j = result.scalar_one_or_none()
    if not j:
        raise HTTPException(status_code=404, detail="Training job not found")

    return StandardResponse.ok({
        "id":              str(j.id),
        "status":          j.status,
        "progress":        j.progress,
        "phase":           j.phase,
        "model_arch":      j.model_arch,
        "data_sources":    j.data_sources,
        "config":          j.config,
        "data_points":     j.data_points,
        "vectors_indexed": j.vectors_indexed,
        "triggered_by":    j.triggered_by,
        "started_at":      j.created_at.isoformat(),
        "finished_at":     j.finished_at.isoformat() if j.finished_at else None,
        "duration_sec":    j.duration_sec,
        "logs":            j.logs or [],
    })


@router.post("/schedule", response_model=StandardResponse[dict])
async def save_schedule(
    body: ScheduleRequest,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Save (or update) the automated training schedule for this tenant.
    Registers or removes the APScheduler cron job accordingly.
    """
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    tenant_id = str(current_user.tenant_id)

    # Delete any existing schedule for this tenant
    await db.execute(delete(TrainingSchedule).where(TrainingSchedule.tenant_id == tid))

    next_run = _next_run(body.freq, body.time_of_day, body.day_of_week)

    sched_row = TrainingSchedule(
        tenant_id=tid,
        freq=body.freq,
        time_of_day=body.time_of_day,
        day_of_week=body.day_of_week,
        data_sources=body.data_sources,
        model_arch=body.model_arch,
        config=body.config.model_dump(),
        is_active=(body.freq != "manual"),
        next_run_at=next_run,
    )
    db.add(sched_row)
    await db.commit()
    await db.refresh(sched_row)

    # Register/remove APScheduler job
    await _reschedule_tenant(tenant_id, sched_row)

    return StandardResponse.ok({
        "freq":         sched_row.freq,
        "time_of_day":  sched_row.time_of_day,
        "day_of_week":  sched_row.day_of_week,
        "is_active":    sched_row.is_active,
        "next_run_at":  sched_row.next_run_at.isoformat() if sched_row.next_run_at else None,
    })


@router.get("/schedule", response_model=StandardResponse[dict])
async def get_schedule(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current training schedule for this tenant."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(
        select(TrainingSchedule).where(TrainingSchedule.tenant_id == tid)
    )
    s = result.scalar_one_or_none()
    if not s:
        return StandardResponse.ok({"freq": "manual"})
    return StandardResponse.ok({
        "freq":         s.freq,
        "time_of_day":  s.time_of_day,
        "day_of_week":  s.day_of_week,
        "data_sources": s.data_sources,
        "model_arch":   s.model_arch,
        "config":       s.config,
        "is_active":    s.is_active,
        "next_run_at":  s.next_run_at.isoformat() if s.next_run_at else None,
        "last_run_at":  s.last_run_at.isoformat() if s.last_run_at else None,
    })


@router.get("/model/status", response_model=StandardResponse[dict])
async def get_model_status(
    current_user=Depends(get_current_user),
    arch: Optional[str] = None,
):
    """Check if a specific arch (or the default) is downloaded in Ollama."""
    model_arch = arch or settings.LOCAL_LLM_MODEL
    model = _ollama_model_name(model_arch)
    all_models = await _list_ollama_models()
    existing_names = [m["name"] for m in all_models]
    ready = any(n.startswith(model.split(":")[0]) for n in existing_names)
    return StandardResponse.ok({
        "arch":  model_arch,
        "model": model,
        "ready": ready,
    })


@router.get("/models", response_model=StandardResponse[list])
async def list_models(current_user=Depends(get_current_user)):
    """Return all downloaded Ollama models with which arch IDs they correspond to."""
    all_models = await _list_ollama_models()
    existing_names = [m["name"] for m in all_models]

    # Reverse-map: ollama name → arch id
    ollama_to_arch = {v.split(":")[0]: k for k, v in ARCH_TO_OLLAMA.items()}

    result = []
    for arch_id, ollama_name in ARCH_TO_OLLAMA.items():
        base = ollama_name.split(":")[0]
        downloaded = any(n.startswith(base) for n in existing_names)
        # find size if present
        size_bytes = next(
            (m.get("size", 0) for m in all_models if m["name"].startswith(base)), 0
        )
        result.append({
            "arch":       arch_id,
            "model":      ollama_name,
            "downloaded": downloaded,
            "size_bytes": size_bytes,
        })
    return StandardResponse.ok(result)


class PullRequest(BaseModel):
    arch: str


@router.post("/model/pull", response_model=StandardResponse[dict])
async def pull_model(
    body: PullRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(require_roles("admin")),
):
    """Trigger an Ollama model pull in the background (non-blocking)."""
    arch = body.arch
    if arch not in ARCH_TO_OLLAMA:
        raise HTTPException(status_code=400, detail=f"Unknown arch: {arch}")

    already = await _is_model_present(arch)
    if already:
        return StandardResponse.ok({"arch": arch, "status": "already_downloaded"})

    # Fire-and-forget background pull (blocking inside the task)
    background_tasks.add_task(_ensure_ollama_model, arch)
    return StandardResponse.ok({"arch": arch, "status": "downloading"})


class DeleteModelRequest(BaseModel):
    arch: str


@router.delete("/model", response_model=StandardResponse[dict])
async def delete_model(
    body: DeleteModelRequest,
    current_user=Depends(require_roles("admin")),
):
    """Delete a downloaded Ollama model. Admin only."""
    arch = body.arch
    if arch not in ARCH_TO_OLLAMA:
        raise HTTPException(status_code=400, detail=f"Unknown arch: {arch}")

    present = await _is_model_present(arch)
    if not present:
        return StandardResponse.ok({"arch": arch, "status": "not_downloaded"})

    ok = await _delete_ollama_model(arch)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete model from Ollama")
    return StandardResponse.ok({"arch": arch, "status": "deleted"})


@router.get("/ollama/health", response_model=StandardResponse[dict])
async def ollama_health(current_user=Depends(get_current_user)):
    """Check whether the Ollama service is reachable and responsive."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.LOCAL_LLM_BASE_URL}/api/tags")
            if resp.status_code == 200:
                models = resp.json().get("models", [])
                return StandardResponse.ok({
                    "running": True,
                    "models_count": len(models),
                    "url": settings.LOCAL_LLM_BASE_URL,
                })
    except Exception:
        pass
    return StandardResponse.ok({
        "running": False,
        "models_count": 0,
        "url": settings.LOCAL_LLM_BASE_URL,
    })


@router.post("/train/{job_id}/cancel", response_model=StandardResponse[dict])
async def cancel_training_job(
    job_id: str,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Mark a running training job as cancelled. The background task will finish its
    current step but the UI will treat the job as done."""
    tid = UUID(current_user.tenant_id)
    try:
        jid = uuid_lib.UUID(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job_id")

    result = await db.execute(
        select(TrainingJob).where(
            and_(TrainingJob.id == jid, TrainingJob.tenant_id == tid)
        )
    )
    j = result.scalar_one_or_none()
    if not j:
        raise HTTPException(status_code=404, detail="Training job not found")
    if j.status != "running":
        return StandardResponse.ok({"job_id": job_id, "status": j.status, "message": "Job is not running"})

    j.status = "cancelled"
    j.phase = "Cancelled"
    j.finished_at = datetime.utcnow()
    logs = list(j.logs or [])
    logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Training cancelled by user.")
    j.logs = logs
    await db.commit()
    return StandardResponse.ok({"job_id": job_id, "status": "cancelled"})


@router.get("/conversations", response_model=StandardResponse[list[ConversationResponse]])
async def list_conversations(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    uid = UUIDT(current_user.user_id)
    result = await db.execute(
        select(CopilotConversation)
        .where(and_(CopilotConversation.user_id == uid,
                    CopilotConversation.is_active == True))
        .order_by(CopilotConversation.created_at.desc()).limit(50)
    )
    return StandardResponse.ok(
        [ConversationResponse.model_validate(c) for c in result.scalars().all()]
    )


@router.get("/conversations/{conversation_id}", response_model=StandardResponse[dict])
async def get_conversation(
    conversation_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    conv = (await db.execute(
        select(CopilotConversation).where(
            and_(CopilotConversation.id == conversation_id,
                 CopilotConversation.tenant_id == tid))
    )).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = (await db.execute(
        select(CopilotMessage)
        .where(CopilotMessage.conversation_id == conversation_id)
        .order_by(CopilotMessage.created_at)
    )).scalars().all()

    return StandardResponse.ok({
        "conversation": ConversationResponse.model_validate(conv),
        "messages":     [MessageResponse.model_validate(m) for m in msgs],
    })


@router.delete("/conversations/{conversation_id}", response_model=StandardResponse[dict])
async def delete_conversation(
    conversation_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(
        select(CopilotConversation).where(
            and_(CopilotConversation.id == conversation_id,
                 CopilotConversation.tenant_id == tid))
    )
    conv = result.scalar_one_or_none()
    if conv:
        conv.is_active = False
    return StandardResponse.ok({"message": "Conversation deleted"})


@router.get("/suggestions", response_model=StandardResponse[list[str]])
async def get_suggestions(current_user=Depends(get_current_user)):
    suggestions = {
        "admin": [
            "Which students have attendance below 75%?",
            "What is the overall fee collection rate this month?",
            "How is the academic performance trending this semester?",
            "Which classes need attention in Mathematics?",
            "Show me a summary of today's attendance",
        ],
        "teacher": [
            "How is my class performing compared to last semester?",
            "Which students need additional support in this subject?",
            "What is the assignment submission rate in my class?",
            "Who are the top performers this week?",
        ],
        "parent": [
            "How is my child doing academically?",
            "What are the upcoming exams and assignments?",
            "Show me my child's attendance summary",
        ],
    }
    return StandardResponse.ok(suggestions.get(current_user.role, suggestions["parent"]))
