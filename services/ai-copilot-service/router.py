"""AI Copilot service router."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.database import get_db
from ..shared.schemas import PaginatedResponse, PaginationParams, StandardResponse
from ..shared.security import get_current_user, require_roles
from .models import CopilotConversation, CopilotMessage
from .rag import rag_pipeline

router = APIRouter(prefix="/api/v1/copilot", tags=["AI Copilot"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[UUID] = None


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


@router.post("/chat", response_model=StandardResponse[ChatResponse])
async def chat(
    body: ChatRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message to the AI Copilot.
    The AI retrieves relevant school data and generates a grounded response.

    Example questions:
    - "Which students have attendance below 75%?"
    - "How is Grade 10-A performing in Mathematics?"
    - "Who are the top 5 students this semester?"
    """
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    uid = UUIDT(current_user.user_id)

    # Get or create conversation
    if body.conversation_id:
        result = await db.execute(
            select(CopilotConversation).where(
                and_(CopilotConversation.id == body.conversation_id, CopilotConversation.tenant_id == tid)
            )
        )
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        # Create new conversation, use message as title (truncated)
        title = body.message[:100] if len(body.message) > 100 else body.message
        conversation = CopilotConversation(tenant_id=tid, user_id=uid, title=title)
        db.add(conversation)
        await db.flush()

    # Get conversation history
    history_result = await db.execute(
        select(CopilotMessage).where(CopilotMessage.conversation_id == conversation.id)
        .order_by(CopilotMessage.created_at).limit(20)
    )
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in history_result.scalars().all()
    ]

    # RAG pipeline
    result_data = await rag_pipeline.answer_question(
        tenant_id=str(tid),
        query=body.message,
        conversation_history=history,
    )

    # Save user message
    user_msg = CopilotMessage(
        tenant_id=tid,
        conversation_id=conversation.id,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    await db.flush()

    # Save assistant message
    assistant_msg = CopilotMessage(
        tenant_id=tid,
        conversation_id=conversation.id,
        role="assistant",
        content=result_data["response"],
        sources=result_data["sources"],
    )
    db.add(assistant_msg)
    await db.flush()

    return StandardResponse.ok(ChatResponse(
        conversation_id=conversation.id,
        message_id=assistant_msg.id,
        response=result_data["response"],
        sources=result_data["sources"],
    ))


@router.get("/conversations", response_model=StandardResponse[list[ConversationResponse]])
async def list_conversations(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    uid = UUIDT(current_user.user_id)
    result = await db.execute(
        select(CopilotConversation).where(
            and_(CopilotConversation.user_id == uid, CopilotConversation.is_active == True)
        ).order_by(CopilotConversation.created_at.desc()).limit(50)
    )
    return StandardResponse.ok([ConversationResponse.model_validate(c) for c in result.scalars().all()])


@router.get("/conversations/{conversation_id}", response_model=StandardResponse[dict])
async def get_conversation(
    conversation_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    conv_result = await db.execute(
        select(CopilotConversation).where(
            and_(CopilotConversation.id == conversation_id, CopilotConversation.tenant_id == tid)
        )
    )
    conversation = conv_result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages_result = await db.execute(
        select(CopilotMessage).where(CopilotMessage.conversation_id == conversation_id)
        .order_by(CopilotMessage.created_at)
    )

    return StandardResponse.ok({
        "conversation": ConversationResponse.model_validate(conversation),
        "messages": [MessageResponse.model_validate(m) for m in messages_result.scalars().all()],
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
            and_(CopilotConversation.id == conversation_id, CopilotConversation.tenant_id == tid)
        )
    )
    conv = result.scalar_one_or_none()
    if conv:
        conv.is_active = False
    return StandardResponse.ok({"message": "Conversation deleted"})


@router.post("/index", response_model=StandardResponse[dict])
async def trigger_indexing(
    background_tasks: BackgroundTasks,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger re-indexing of all school data for AI search.
    Runs in background - returns immediately.
    """
    tenant_id = current_user.tenant_id

    async def index_all_data():
        # In production, fetch real data from student/attendance/exam services
        # Simplified example data:
        sample_data = [
            {"id": "1", "first_name": "Alice", "last_name": "Johnson",
             "class_name": "Grade 10-A", "attendance_pct": 92, "avg_grade": "A"},
        ]
        await rag_pipeline.index_school_data(str(tenant_id), "student", sample_data)

    background_tasks.add_task(index_all_data)
    return StandardResponse.ok({"message": "Indexing started in background"})


@router.get("/suggestions", response_model=StandardResponse[list[str]])
async def get_suggestions(current_user=Depends(get_current_user)):
    """Get example AI query suggestions for the dashboard."""
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
