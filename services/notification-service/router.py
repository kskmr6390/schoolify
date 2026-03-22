"""Notification service router."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.database import get_db
from ..shared.schemas import PaginatedResponse, PaginationParams, StandardResponse
from ..shared.security import get_current_user, require_roles
from .models import DeviceToken, Notification, NotificationPreference

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
