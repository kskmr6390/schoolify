"""Notification service router."""
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.database import get_db
from ..shared.schemas import PaginatedResponse, PaginationParams, StandardResponse
from ..shared.security import get_current_user, require_roles
from .models import Award, ChatConversation, ChatMessage, DeviceToken, Notification, NotificationPreference

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


class DeviceRegisterRequest(BaseModel):
    token: str
    platform: str  # ios, android, web


class PreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None


class NotificationResponse(BaseModel):
    id: UUID
    title: str
    body: str
    channel: Optional[str] = None
    is_read: bool = False
    sent_at: Optional[datetime] = None
    extra_data: Optional[dict] = None
    created_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


@router.get("", response_model=StandardResponse[PaginatedResponse[NotificationResponse]])
async def get_notifications(
    params: PaginationParams = Depends(),
    unread_only: bool = False,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    uid = UUIDT(current_user.user_id)
    query = select(Notification).where(Notification.user_id == uid)
    if unread_only:
        query = query.where(Notification.is_read == False)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    result = await db.execute(query.offset(params.offset).limit(params.limit).order_by(Notification.created_at.desc()))
    return StandardResponse.ok(PaginatedResponse.create(
        items=[NotificationResponse.model_validate(n) for n in result.scalars().all()],
        total=total, page=params.page, limit=params.limit,
    ))


@router.get("/unread-count", response_model=StandardResponse[dict])
async def get_unread_count(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    uid = UUIDT(current_user.user_id)
    result = await db.execute(
        select(func.count(Notification.id)).where(
            and_(Notification.user_id == uid, Notification.is_read == False)
        )
    )
    return StandardResponse.ok({"count": result.scalar()})


@router.put("/{notification_id}/read", response_model=StandardResponse[dict])
async def mark_as_read(
    notification_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    result = await db.execute(
        select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == UUIDT(current_user.user_id))
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    return StandardResponse.ok({"message": "Marked as read"})


@router.put("/read-all", response_model=StandardResponse[dict])
async def mark_all_read(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    from sqlalchemy import update
    uid = UUIDT(current_user.user_id)
    await db.execute(
        select(Notification).where(and_(Notification.user_id == uid, Notification.is_read == False))
    )
    # Simplified: update all unread for user
    result = await db.execute(select(Notification).where(and_(Notification.user_id == uid, Notification.is_read == False)))
    for n in result.scalars().all():
        n.is_read = True
        n.read_at = datetime.utcnow()
    return StandardResponse.ok({"message": "All notifications marked as read"})


@router.get("/preferences", response_model=StandardResponse[dict])
async def get_preferences(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    uid = UUIDT(current_user.user_id)
    result = await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == uid))
    pref = result.scalar_one_or_none()
    if not pref:
        return StandardResponse.ok({"email_enabled": True, "sms_enabled": True, "push_enabled": True})
    return StandardResponse.ok({
        "email_enabled": pref.email_enabled,
        "sms_enabled": pref.sms_enabled,
        "push_enabled": pref.push_enabled,
        "in_app_enabled": pref.in_app_enabled,
    })


@router.put("/preferences", response_model=StandardResponse[dict])
async def update_preferences(
    body: PreferenceUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    uid = UUIDT(current_user.user_id)
    tid = UUIDT(current_user.tenant_id)

    result = await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == uid))
    pref = result.scalar_one_or_none()
    if not pref:
        pref = NotificationPreference(tenant_id=tid, user_id=uid)
        db.add(pref)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(pref, field, value)

    return StandardResponse.ok({"message": "Preferences updated"})


@router.post("/devices/register", response_model=StandardResponse[dict])
async def register_device(
    body: DeviceRegisterRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a device push token for the current user."""
    from uuid import UUID as UUIDT
    uid = UUIDT(current_user.user_id)
    tid = UUIDT(current_user.tenant_id)

    # Check if token already registered
    result = await db.execute(
        select(DeviceToken).where(and_(DeviceToken.user_id == uid, DeviceToken.token == body.token))
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.is_active = True
        existing.last_used_at = datetime.utcnow()
    else:
        db.add(DeviceToken(
            tenant_id=tid,
            user_id=uid,
            token=body.token,
            platform=body.platform,
        ))
    return StandardResponse.ok({"message": "Device registered"})


# ── Chat ──────────────────────────────────────────────────────────────────────

class CreateConversationRequest(BaseModel):
    type: str = "direct"           # direct | group
    participant_ids: List[str]     # user IDs to include (excluding self)
    name: Optional[str] = None     # required for group chats


class SendMessageRequest(BaseModel):
    text: str
    sender_name: str


def _convo_to_dict(c: ChatConversation) -> dict:
    return {
        "id": str(c.id),
        "type": c.type,
        "name": c.name,
        "participants": c.participants or [],
        "created_by": str(c.created_by),
        "updated_at": c.updated_at.isoformat() if c.updated_at else c.created_at.isoformat(),
        "created_at": c.created_at.isoformat(),
    }


def _msg_to_dict(m: ChatMessage) -> dict:
    return {
        "id": str(m.id),
        "conversation_id": str(m.conversation_id),
        "sender_id": str(m.sender_id),
        "sender_name": m.sender_name,
        "text": m.text,
        "type": m.type,
        "created_at": m.created_at.isoformat(),
    }


@router.post("/chat/conversations", response_model=StandardResponse)
async def create_or_get_conversation(
    body: CreateConversationRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new conversation or return existing direct conversation."""
    from uuid import UUID as UUIDT
    uid = UUIDT(current_user.user_id)
    tid = UUIDT(current_user.tenant_id)

    all_participants = [str(uid)] + [str(p) for p in body.participant_ids]
    all_participants_sorted = sorted(set(all_participants))

    if body.type == "direct" and len(all_participants_sorted) == 2:
        # Check if a direct conversation already exists between these two users
        result = await db.execute(
            select(ChatConversation).where(
                and_(
                    ChatConversation.tenant_id == tid,
                    ChatConversation.type == "direct",
                )
            )
        )
        for existing in result.scalars().all():
            existing_parts = sorted(existing.participants or [])
            if existing_parts == all_participants_sorted:
                return StandardResponse.ok(_convo_to_dict(existing))

    convo = ChatConversation(
        tenant_id=tid,
        type=body.type,
        name=body.name,
        participants=all_participants_sorted,
        created_by=uid,
    )
    db.add(convo)
    await db.flush()
    await db.refresh(convo)
    return StandardResponse.ok(_convo_to_dict(convo))


@router.get("/chat/conversations", response_model=StandardResponse)
async def list_conversations(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all conversations the current user is a participant in."""
    from uuid import UUID as UUIDT
    uid_str = current_user.user_id
    tid = UUIDT(current_user.tenant_id)

    result = await db.execute(
        select(ChatConversation).where(ChatConversation.tenant_id == tid)
    )
    convos = [c for c in result.scalars().all() if uid_str in (c.participants or [])]
    convos.sort(key=lambda c: c.updated_at or c.created_at, reverse=True)

    # Attach last message to each conversation
    output = []
    for c in convos:
        d = _convo_to_dict(c)
        last_msg_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == c.id)
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        last = last_msg_result.scalar_one_or_none()
        d["last_message"] = _msg_to_dict(last) if last else None
        output.append(d)

    return StandardResponse.ok(output)


@router.post("/chat/conversations/{conversation_id}/messages", response_model=StandardResponse)
async def send_message(
    conversation_id: UUID,
    body: SendMessageRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to a conversation."""
    from uuid import UUID as UUIDT
    uid = UUIDT(current_user.user_id)
    tid = UUIDT(current_user.tenant_id)

    convo_result = await db.execute(
        select(ChatConversation).where(
            and_(ChatConversation.id == conversation_id, ChatConversation.tenant_id == tid)
        )
    )
    convo = convo_result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.user_id not in (convo.participants or []):
        raise HTTPException(status_code=403, detail="Not a participant")

    msg = ChatMessage(
        tenant_id=tid,
        conversation_id=conversation_id,
        sender_id=uid,
        sender_name=body.sender_name,
        text=body.text,
        type="text",
    )
    db.add(msg)

    # Touch conversation updated_at so conversation list re-sorts
    convo.updated_at = datetime.utcnow()

    await db.flush()
    await db.refresh(msg)
    return StandardResponse.ok(_msg_to_dict(msg))


@router.get("/chat/conversations/{conversation_id}/messages", response_model=StandardResponse)
async def get_messages(
    conversation_id: UUID,
    since: Optional[str] = Query(None, description="ISO timestamp — return only messages after this"),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a conversation. Use `since` for polling new messages."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    convo_result = await db.execute(
        select(ChatConversation).where(
            and_(ChatConversation.id == conversation_id, ChatConversation.tenant_id == tid)
        )
    )
    convo = convo_result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if current_user.user_id not in (convo.participants or []):
        raise HTTPException(status_code=403, detail="Not a participant")

    query = select(ChatMessage).where(ChatMessage.conversation_id == conversation_id)
    if since:
        try:
            since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
            query = query.where(ChatMessage.created_at > since_dt)
        except ValueError:
            pass
    query = query.order_by(ChatMessage.created_at.asc())

    result = await db.execute(query)
    return StandardResponse.ok([_msg_to_dict(m) for m in result.scalars().all()])


# ── Awards ─────────────────────────────────────────────────────────────────────

class CreateAwardRequest(BaseModel):
    title: str
    description: Optional[str] = None
    icon: str = "trophy"
    category: Optional[str] = None
    recipient_id: str
    recipient_name: str
    recipient_class: Optional[str] = None
    awarded_by_name: str
    shared_to_feed: bool = True


def _award_to_dict(a: Award) -> dict:
    return {
        "id": str(a.id),
        "title": a.title,
        "description": a.description,
        "icon": a.icon,
        "category": a.category,
        "recipient_id": str(a.recipient_id),
        "recipient_name": a.recipient_name,
        "recipient_class": a.recipient_class,
        "awarded_by_id": str(a.awarded_by_id),
        "awarded_by_name": a.awarded_by_name,
        "shared_to_feed": a.shared_to_feed,
        "created_at": a.created_at.isoformat(),
    }


@router.post("/awards", response_model=StandardResponse)
async def create_award(
    body: CreateAwardRequest,
    current_user=Depends(require_roles("admin", "super_admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    """Create an award for a student/staff member. Optionally shares to feed."""
    from uuid import UUID as UUIDT
    uid = UUIDT(current_user.user_id)
    tid = UUIDT(current_user.tenant_id)

    award = Award(
        tenant_id=tid,
        title=body.title,
        description=body.description,
        icon=body.icon,
        category=body.category,
        recipient_id=UUIDT(body.recipient_id),
        recipient_name=body.recipient_name,
        recipient_class=body.recipient_class,
        awarded_by_id=uid,
        awarded_by_name=body.awarded_by_name,
        shared_to_feed=body.shared_to_feed,
    )
    db.add(award)

    # Also create an in-app notification for the recipient
    notif = Notification(
        tenant_id=tid,
        user_id=UUIDT(body.recipient_id),
        title=f"You received an award: {body.title}",
        body=body.description or f"Awarded by {body.awarded_by_name}",
        channel="in_app",
        extra_data={"type": "award", "category": body.category, "icon": body.icon},
    )
    db.add(notif)

    await db.flush()
    await db.refresh(award)
    return StandardResponse.ok(_award_to_dict(award))


@router.get("/awards", response_model=StandardResponse)
async def list_awards(
    recipient_id: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List awards.
    - admin/teacher/super_admin: all awards, optionally filtered by recipient_id
    - student: only own awards
    - parent: awards for their linked children (client passes recipient_id)
    """
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    role = current_user.role.lower() if hasattr(current_user.role, 'lower') else str(current_user.role).lower()

    query = select(Award).where(Award.tenant_id == tid)

    if role in ("student",):
        # Students see only their own awards
        query = query.where(Award.recipient_id == UUIDT(current_user.user_id))
    elif role == "parent":
        # Parent must supply recipient_id (their child's ID)
        if recipient_id:
            query = query.where(Award.recipient_id == UUIDT(recipient_id))
        else:
            return StandardResponse.ok([])
    else:
        # Staff: optionally filter
        if recipient_id:
            query = query.where(Award.recipient_id == UUIDT(recipient_id))

    query = query.order_by(Award.created_at.desc())
    result = await db.execute(query)
    return StandardResponse.ok([_award_to_dict(a) for a in result.scalars().all()])


@router.delete("/awards/{award_id}", response_model=StandardResponse)
async def delete_award(
    award_id: UUID,
    current_user=Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(
        select(Award).where(and_(Award.id == award_id, Award.tenant_id == tid))
    )
    award = result.scalar_one_or_none()
    if not award:
        raise HTTPException(status_code=404, detail="Award not found")
    await db.delete(award)
    return StandardResponse.ok({"message": "Award deleted"})
