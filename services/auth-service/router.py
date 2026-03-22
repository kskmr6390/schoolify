"""Auth service API router with all endpoints."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.database import get_db
from ..shared.schemas import PaginatedResponse, PaginationParams, StandardResponse
from ..shared.security import get_current_user, require_roles
from .models import AuditLog, User, UserRole, UserStatus
from .schemas import (
    AuditLogResponse,
    ChangePasswordRequest,
    CreateUserRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserProfile,
)
from .service import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
auth_service = AuthService()


async def _resolve_tenant_id(tenant_slug: str, db: AsyncSession) -> UUID:
    """Resolve tenant slug → tenant_id via Redis cache, then DB fallback."""
    from ..shared.redis_client import cache_get, cache_set
    cached = await cache_get(f"tenant:slug:{tenant_slug}")
    if cached:
        return UUID(cached["id"])
    # DB fallback
    from sqlalchemy import select as sa_select, text as sa_text
    row = await db.execute(
        sa_text("SELECT id FROM tenants WHERE slug=:slug AND status='ACTIVE' LIMIT 1"),
        {"slug": tenant_slug},
    )
    result = row.fetchone()
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"School '{tenant_slug}' not found")
    tid = str(result[0])
    await cache_set(f"tenant:slug:{tenant_slug}", {"id": tid}, ttl=86400)
    return UUID(tid)


@router.post("/login", response_model=StandardResponse[LoginResponse])
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with email and password."""
    tenant_id = await _resolve_tenant_id(body.tenant_slug, db)
    result = await auth_service.login(
        email=body.email,
        password=body.password,
        tenant_id=tenant_id,
        db=db,
        ip_address=request.client.host if request.client else None,
    )
    return StandardResponse.ok(result)


@router.post("/register", response_model=StandardResponse[UserProfile], status_code=201)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user. In most schools, only admins can create users."""
    tenant_id = await _resolve_tenant_id(body.tenant_slug, db)
    user = await auth_service.register(body, tenant_id, db)
    return StandardResponse.ok(user)


@router.post("/refresh", response_model=StandardResponse[TokenResponse])
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange refresh token for new access + refresh token pair."""
    result = await auth_service.refresh_tokens(body.refresh_token, db)
    return StandardResponse.ok(result)


@router.post("/logout", response_model=StandardResponse[dict])
async def logout(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Revoke the refresh token (logout from current device)."""
    await auth_service.logout(body.refresh_token, db)
    return StandardResponse.ok({"message": "Logged out successfully"})


@router.get("/me", response_model=StandardResponse[UserProfile])
async def get_me(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user's profile."""
    result = await db.execute(
        select(User).where(User.id == current_user.user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return StandardResponse.ok(UserProfile.model_validate(user))


@router.put("/me", response_model=StandardResponse[UserProfile])
async def update_me(
    body: UpdateProfileRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile."""
    result = await db.execute(select(User).where(User.id == current_user.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)

    return StandardResponse.ok(UserProfile.model_validate(user))


@router.post("/change-password", response_model=StandardResponse[dict])
async def change_password(
    body: ChangePasswordRequest,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change current user's password."""
    from ..shared.security import get_password_hash, verify_password
    result = await db.execute(select(User).where(User.id == current_user.user_id))
    user = result.scalar_one_or_none()

    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    user.password_hash = get_password_hash(body.new_password)
    return StandardResponse.ok({"message": "Password changed successfully"})


@router.post("/google", response_model=StandardResponse[LoginResponse])
async def google_auth(
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with Google OAuth ID token."""
    tenant_id = await _resolve_tenant_id(body.tenant_slug, db)
    result = await auth_service.google_auth(body.id_token, tenant_id, db)
    return StandardResponse.ok(result)


@router.post("/forgot-password", response_model=StandardResponse[dict])
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send password reset email."""
    # Always return success to prevent email enumeration
    tenant_id = await _resolve_tenant_id(body.tenant_slug, db)
    result = await db.execute(
        select(User).where(and_(User.email == body.email.lower(), User.tenant_id == tenant_id))
    )
    user = result.scalar_one_or_none()
    if user:
        import secrets
        from datetime import timedelta
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        from datetime import datetime
        user.password_reset_expires = datetime.utcnow() + timedelta(hours=1)
        # TODO: Send email via notification service
    return StandardResponse.ok({"message": "If that email exists, a reset link has been sent"})


@router.post("/reset-password", response_model=StandardResponse[dict])
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using token from email."""
    from datetime import datetime
    from ..shared.security import get_password_hash
    result = await db.execute(
        select(User).where(
            and_(
                User.password_reset_token == body.token,
                User.password_reset_expires > datetime.utcnow(),
            )
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.password_hash = get_password_hash(body.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    return StandardResponse.ok({"message": "Password reset successfully"})


@router.get("/users", response_model=StandardResponse[PaginatedResponse[UserProfile]])
async def list_users(
    params: PaginationParams = Depends(),
    role: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user=Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    """List all users in the tenant. Admin only."""
    query = select(User).where(User.tenant_id == current_user.tenant_id)
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)

    from sqlalchemy import func
    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.offset(params.offset).limit(params.limit).order_by(User.created_at.desc())
    result = await db.execute(query)
    users = result.scalars().all()

    return StandardResponse.ok(
        PaginatedResponse.create(
            items=[UserProfile.model_validate(u) for u in users],
            total=total,
            page=params.page,
            limit=params.limit,
        )
    )


@router.post("/users", response_model=StandardResponse[UserProfile], status_code=201)
async def create_user(
    body: CreateUserRequest,
    current_user=Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user in the tenant. Admin only."""
    data = RegisterRequest(
        email=body.email,
        password=body.password,
        first_name=body.first_name,
        last_name=body.last_name,
        role=body.role,
        tenant_slug="",  # Not needed here since we have tenant_id
    )
    # Use tenant_id from current user
    from uuid import UUID
    user = await auth_service.register(data, UUID(current_user.tenant_id), db)
    return StandardResponse.ok(user)


@router.get("/users/{user_id}", response_model=StandardResponse[UserProfile])
async def get_user(
    user_id: UUID,
    current_user=Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(
            and_(User.id == user_id, User.tenant_id == current_user.tenant_id)
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return StandardResponse.ok(UserProfile.model_validate(user))


@router.delete("/users/{user_id}", response_model=StandardResponse[dict])
async def deactivate_user(
    user_id: UUID,
    current_user=Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a user by setting status to inactive."""
    result = await db.execute(
        select(User).where(
            and_(User.id == user_id, User.tenant_id == current_user.tenant_id)
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = UserStatus.INACTIVE
    return StandardResponse.ok({"message": "User deactivated"})


@router.get("/audit-logs", response_model=StandardResponse[PaginatedResponse[AuditLogResponse]])
async def get_audit_logs(
    params: PaginationParams = Depends(),
    user_id: Optional[UUID] = Query(None),
    action: Optional[str] = Query(None),
    current_user=Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get audit logs for the tenant. Admin only."""
    from uuid import UUID as UUIDT
    from sqlalchemy import func
    query = select(AuditLog).where(AuditLog.tenant_id == UUIDT(current_user.tenant_id))
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.offset(params.offset).limit(params.limit).order_by(AuditLog.created_at.desc())
    result = await db.execute(query)
    logs = result.scalars().all()

    return StandardResponse.ok(
        PaginatedResponse.create(
            items=[AuditLogResponse.model_validate(log) for log in logs],
            total=total,
            page=params.page,
            limit=params.limit,
        )
    )
