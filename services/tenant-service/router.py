"""Tenant service API router."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.database import get_db
from ..shared.redis_client import cache_delete, cache_set
from ..shared.schemas import PaginatedResponse, PaginationParams, StandardResponse
from ..shared.security import get_current_user, require_roles
from .models import (DEFAULT_FEATURE_FLAGS, DEFAULT_SETTINGS, FeatureFlag,
                     Tenant, TenantSetting, TenantStatus)
from .schemas import (CreateTenantRequest, FeatureFlagUpdate,
                      OnboardTenantRequest, RegisterSchoolRequest, RegisterSchoolResponse,
                      TenantBrandingResponse, TenantResponse, TenantSettingsUpdate,
                      UpdateTenantRequest)

router = APIRouter(prefix="/api/v1/tenants", tags=["Tenants"])


@router.post("/register", response_model=StandardResponse[RegisterSchoolResponse], status_code=201)
async def register_school(
    body: RegisterSchoolRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Public self-service school registration.
    Step 1: creates the tenant.
    Frontend follows up with POST /api/v1/auth/register to create the admin account.
    """
    # Validate slug uniqueness
    existing = await db.execute(select(Tenant).where(Tenant.slug == body.school_code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"School code '{body.school_code}' is already taken")

    tenant = Tenant(
        slug=body.school_code,
        name=body.school_name,
        email=body.school_email,
        phone=body.school_phone,
        status=TenantStatus.ACTIVE,
    )
    db.add(tenant)
    await db.flush()

    for key, value in DEFAULT_SETTINGS.items():
        db.add(TenantSetting(tenant_id=tenant.id, key=key, value=value))

    for flag_name, enabled in DEFAULT_FEATURE_FLAGS.items():
        db.add(FeatureFlag(tenant_id=tenant.id, flag_name=flag_name, enabled=enabled))

    await cache_set(f"tenant:slug:{tenant.slug}", {"id": str(tenant.id), "name": tenant.name}, ttl=3600)

    return StandardResponse.ok(RegisterSchoolResponse(
        tenant_id=tenant.id,
        school_code=tenant.slug,
        school_name=tenant.name,
        message="School created. Complete registration by creating your admin account.",
    ))


@router.post("", response_model=StandardResponse[TenantResponse], status_code=201)
async def create_tenant(
    body: CreateTenantRequest,
    current_user=Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    """Create a new school tenant. Super admin only."""
    # Check slug uniqueness
    existing = await db.execute(select(Tenant).where(Tenant.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Slug '{body.slug}' is already taken")

    tenant = Tenant(
        slug=body.slug,
        name=body.name,
        email=body.email,
        phone=body.phone,
        address=body.address,
        plan=body.plan,
    )
    db.add(tenant)
    await db.flush()

    # Create default settings
    for key, value in DEFAULT_SETTINGS.items():
        db.add(TenantSetting(tenant_id=tenant.id, key=key, value=value))

    # Create default feature flags
    for flag_name, enabled in DEFAULT_FEATURE_FLAGS.items():
        db.add(FeatureFlag(tenant_id=tenant.id, flag_name=flag_name, enabled=enabled))

    # Cache the slug → tenant mapping for fast lookups
    await cache_set(f"tenant:slug:{tenant.slug}", {"id": str(tenant.id), "name": tenant.name}, ttl=3600)

    return StandardResponse.ok(TenantResponse.model_validate(tenant))


@router.get("", response_model=StandardResponse[PaginatedResponse[TenantResponse]])
async def list_tenants(
    params: PaginationParams = Depends(),
    current_user=Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    """List all tenants. Super admin only."""
    from sqlalchemy import func
    count = await db.execute(select(func.count(Tenant.id)))
    total = count.scalar()

    result = await db.execute(
        select(Tenant).offset(params.offset).limit(params.limit).order_by(Tenant.created_at.desc())
    )
    tenants = result.scalars().all()

    return StandardResponse.ok(
        PaginatedResponse.create(
            items=[TenantResponse.model_validate(t) for t in tenants],
            total=total, page=params.page, limit=params.limit,
        )
    )


@router.get("/settings", response_model=StandardResponse[dict])
async def get_my_settings_alias(
    current_user=Depends(require_roles("super_admin", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Alias: GET /api/v1/settings → tenant settings (used by frontend settings page)."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(select(TenantSetting).where(TenantSetting.tenant_id == tid))
    settings = result.scalars().all()
    return StandardResponse.ok({s.key: s.value for s in settings})


@router.patch("/settings", response_model=StandardResponse[dict])
async def patch_my_settings_alias(
    body: TenantSettingsUpdate,
    current_user=Depends(require_roles("super_admin", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Alias: PATCH /api/v1/settings → update tenant settings."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    for key, value in body.settings.items():
        result = await db.execute(
            select(TenantSetting).where(and_(TenantSetting.tenant_id == tid, TenantSetting.key == key))
        )
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = value
        else:
            db.add(TenantSetting(tenant_id=tid, key=key, value=value))
    return StandardResponse.ok({"message": "Settings updated"})


@router.get("/by-slug/{slug}", response_model=StandardResponse[TenantBrandingResponse])
async def get_tenant_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    """
    Resolve tenant by slug. Used by API gateway and client apps.
    Public endpoint - returns only branding info, no sensitive data.
    """
    # Check cache first
    from ..shared.redis_client import cache_get
    cached = await cache_get(f"tenant:slug:{slug}")

    result = await db.execute(select(Tenant).where(and_(Tenant.slug == slug, Tenant.status == TenantStatus.ACTIVE)))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="School not found")

    # Cache for fast future lookups
    await cache_set(f"tenant:slug:{slug}", {"id": str(tenant.id), "name": tenant.name}, ttl=3600)

    return StandardResponse.ok(TenantBrandingResponse(
        tenant_id=tenant.id,
        name=tenant.name,
        logo_url=tenant.logo_url,
        primary_color=tenant.primary_color,
        secondary_color=tenant.secondary_color,
        favicon_url=tenant.favicon_url,
    ))


@router.get("/{tenant_id}", response_model=StandardResponse[TenantResponse])
async def get_tenant(
    tenant_id: UUID,
    current_user=Depends(require_roles("super_admin", "admin")),
    db: AsyncSession = Depends(get_db),
):
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return StandardResponse.ok(TenantResponse.model_validate(tenant))


@router.put("/{tenant_id}", response_model=StandardResponse[TenantResponse])
async def update_tenant(
    tenant_id: UUID,
    body: UpdateTenantRequest,
    current_user=Depends(require_roles("super_admin", "admin")),
    db: AsyncSession = Depends(get_db),
):
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tenant, field, value)

    # Invalidate cache
    await cache_delete(f"tenant:slug:{tenant.slug}")
    await cache_set(f"tenant:slug:{tenant.slug}", {"id": str(tenant.id), "name": tenant.name}, ttl=3600)

    return StandardResponse.ok(TenantResponse.model_validate(tenant))


@router.post("/{tenant_id}/onboard", response_model=StandardResponse[dict])
async def onboard_tenant(
    tenant_id: UUID,
    body: OnboardTenantRequest,
    current_user=Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Complete tenant onboarding:
    1. Create admin user account
    2. Update settings (timezone, currency)
    3. Mark tenant as onboarded
    """
    from datetime import datetime
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Update settings
    timezone_setting = await db.execute(
        select(TenantSetting).where(and_(
            TenantSetting.tenant_id == tenant_id,
            TenantSetting.key == "timezone",
        ))
    )
    ts = timezone_setting.scalar_one_or_none()
    if ts:
        ts.value = body.timezone

    currency_setting = await db.execute(
        select(TenantSetting).where(and_(
            TenantSetting.tenant_id == tenant_id,
            TenantSetting.key == "currency",
        ))
    )
    cs = currency_setting.scalar_one_or_none()
    if cs:
        cs.value = body.currency

    tenant.status = TenantStatus.ACTIVE
    tenant.onboarded_at = datetime.utcnow()

    # Note: actual admin user creation would call auth service
    # Here we return instructions for the caller
    return StandardResponse.ok({
        "message": "Tenant onboarded successfully",
        "tenant_id": str(tenant_id),
        "next_step": "Create admin user via POST /api/v1/auth/register",
    })


@router.get("/settings", response_model=StandardResponse[dict])
async def get_my_settings(
    current_user=Depends(require_roles("super_admin", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Get settings for the current user's tenant (resolves tenant_id from JWT)."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(select(TenantSetting).where(TenantSetting.tenant_id == tid))
    settings = result.scalars().all()
    return StandardResponse.ok({s.key: s.value for s in settings})


@router.patch("/settings", response_model=StandardResponse[dict])
async def patch_my_settings(
    body: TenantSettingsUpdate,
    current_user=Depends(require_roles("super_admin", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Upsert settings for the current user's tenant."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    for key, value in body.settings.items():
        result = await db.execute(
            select(TenantSetting).where(and_(TenantSetting.tenant_id == tid, TenantSetting.key == key))
        )
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = value
        else:
            db.add(TenantSetting(tenant_id=tid, key=key, value=value))
    return StandardResponse.ok({"message": "Settings updated"})


@router.get("/{tenant_id}/settings", response_model=StandardResponse[dict])
async def get_settings(
    tenant_id: UUID,
    current_user=Depends(require_roles("super_admin", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TenantSetting).where(TenantSetting.tenant_id == tenant_id)
    )
    settings = result.scalars().all()
    return StandardResponse.ok({s.key: s.value for s in settings})


@router.put("/{tenant_id}/settings", response_model=StandardResponse[dict])
async def update_settings(
    tenant_id: UUID,
    body: TenantSettingsUpdate,
    current_user=Depends(require_roles("super_admin", "admin")),
    db: AsyncSession = Depends(get_db),
):
    for key, value in body.settings.items():
        result = await db.execute(
            select(TenantSetting).where(
                and_(TenantSetting.tenant_id == tenant_id, TenantSetting.key == key)
            )
        )
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = value
        else:
            db.add(TenantSetting(tenant_id=tenant_id, key=key, value=value))
    return StandardResponse.ok({"message": "Settings updated"})


@router.get("/{tenant_id}/feature-flags", response_model=StandardResponse[dict])
async def get_feature_flags(
    tenant_id: UUID,
    current_user=Depends(require_roles("super_admin", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FeatureFlag).where(FeatureFlag.tenant_id == tenant_id)
    )
    flags = result.scalars().all()
    return StandardResponse.ok({f.flag_name: {"enabled": f.enabled, "config": f.config} for f in flags})


@router.put("/{tenant_id}/feature-flags/{flag_name}", response_model=StandardResponse[dict])
async def update_feature_flag(
    tenant_id: UUID,
    flag_name: str,
    body: FeatureFlagUpdate,
    current_user=Depends(require_roles("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FeatureFlag).where(
            and_(FeatureFlag.tenant_id == tenant_id, FeatureFlag.flag_name == flag_name)
        )
    )
    flag = result.scalar_one_or_none()
    if not flag:
        db.add(FeatureFlag(tenant_id=tenant_id, flag_name=flag_name, enabled=body.enabled, config=body.config or {}))
    else:
        flag.enabled = body.enabled
        if body.config is not None:
            flag.config = body.config

    # Invalidate feature flag cache for this tenant
    await cache_delete(f"feature_flags:{tenant_id}")
    return StandardResponse.ok({"flag": flag_name, "enabled": body.enabled})
