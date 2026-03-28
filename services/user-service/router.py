from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from uuid import UUID
from typing import Optional

from services.shared.database import get_db
from services.shared.security import get_current_user, require_roles, TokenData
from services.shared.schemas import StandardResponse
from services.user_service.models import UserProfile, StaffProfile
from services.user_service.schemas import (
    UserProfileCreate, UserProfileUpdate, UserProfileResponse,
    StaffProfileCreate, StaffProfileUpdate, StaffProfileResponse,
)

router = APIRouter()


# ─── User Profiles ───────────────────────────────────────────────────────────

@router.get("/profiles/me", response_model=StandardResponse)
async def get_my_profile(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserProfile).where(
            UserProfile.user_id == current_user.user_id,
            UserProfile.tenant_id == current_user.tenant_id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return StandardResponse(success=True, data=UserProfileResponse.from_orm(profile))


@router.post("/profiles", response_model=StandardResponse, status_code=201)
async def create_profile(
    payload: UserProfileCreate,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(UserProfile).where(
            UserProfile.user_id == payload.user_id,
            UserProfile.tenant_id == current_user.tenant_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Profile already exists for this user")

    profile = UserProfile(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(exclude_none=True),
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return StandardResponse(success=True, data=UserProfileResponse.from_orm(profile))


@router.put("/profiles/me", response_model=StandardResponse)
async def update_my_profile(
    payload: UserProfileUpdate,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserProfile).where(
            UserProfile.user_id == current_user.user_id,
            UserProfile.tenant_id == current_user.tenant_id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    # Mark profile complete if key fields are filled
    if profile.phone and profile.date_of_birth and profile.gender:
        profile.is_profile_complete = True

    await db.commit()
    await db.refresh(profile)
    return StandardResponse(success=True, data=UserProfileResponse.from_orm(profile))


@router.get("/profiles/{user_id}", response_model=StandardResponse)
async def get_profile_by_user(
    user_id: UUID,
    current_user: TokenData = Depends(require_roles("admin", "teacher", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserProfile).where(
            UserProfile.user_id == user_id,
            UserProfile.tenant_id == current_user.tenant_id,
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return StandardResponse(success=True, data=UserProfileResponse.from_orm(profile))


# ─── Staff Profiles ──────────────────────────────────────────────────────────

@router.post("/staff-profiles", response_model=StandardResponse, status_code=201)
async def create_staff_profile(
    payload: StaffProfileCreate,
    current_user: TokenData = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(StaffProfile).where(
            StaffProfile.user_id == payload.user_id,
            StaffProfile.tenant_id == current_user.tenant_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Staff profile already exists")

    staff = StaffProfile(
        tenant_id=current_user.tenant_id,
        **payload.model_dump(exclude_none=True),
    )
    db.add(staff)
    await db.commit()
    await db.refresh(staff)
    return StandardResponse(success=True, data=StaffProfileResponse.from_orm(staff))


@router.get("/staff-profiles/{user_id}", response_model=StandardResponse)
async def get_staff_profile(
    user_id: UUID,
    current_user: TokenData = Depends(require_roles("admin", "teacher", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StaffProfile).where(
            StaffProfile.user_id == user_id,
            StaffProfile.tenant_id == current_user.tenant_id,
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")
    return StandardResponse(success=True, data=StaffProfileResponse.from_orm(staff))


@router.put("/staff-profiles/{user_id}", response_model=StandardResponse)
async def update_staff_profile(
    user_id: UUID,
    payload: StaffProfileUpdate,
    current_user: TokenData = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(StaffProfile).where(
            StaffProfile.user_id == user_id,
            StaffProfile.tenant_id == current_user.tenant_id,
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff profile not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(staff, field, value)

    await db.commit()
    await db.refresh(staff)
    return StandardResponse(success=True, data=StaffProfileResponse.from_orm(staff))


# ─── Staff List (HR) ─────────────────────────────────────────────────────────

@router.get("/staff-list", response_model=StandardResponse)
async def list_staff(
    staff_type: Optional[str] = Query(None),
    role: Optional[str] = Query(None, description="teacher|admin"),
    current_user: TokenData = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    """List all staff with their profiles — joins users + staff_profiles."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    role_filter = ""
    if role:
        role_filter = f"AND LOWER(u.role::text) = '{role.lower()}'"

    rows = (await db.execute(text(f"""
        SELECT
          u.id, u.first_name, u.last_name, u.email, u.status::text AS status,
          LOWER(u.role::text) AS role, u.created_at,
          sp.id AS sp_id, sp.employee_id, sp.department, sp.designation,
          sp.date_of_joining, sp.qualifications, sp.subject_expertise
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id AND sp.tenant_id = :tid
        WHERE u.tenant_id = :tid
          AND LOWER(u.role::text) IN ('teacher', 'admin')
          {role_filter}
        ORDER BY u.first_name, u.last_name
    """), {"tid": tid})).fetchall()

    result = []
    for r in rows:
        result.append({
            "id": str(r[0]),
            "first_name": r[1],
            "last_name": r[2],
            "email": r[3],
            "status": r[4],
            "role": r[5],
            "created_at": str(r[6]) if r[6] else None,
            "staff_profile": {
                "id": str(r[7]) if r[7] else None,
                "employee_id": r[8],
                "department": r[9],
                "designation": r[10],
                "date_of_joining": str(r[11]) if r[11] else None,
                "qualifications": r[12] or [],
                "subject_expertise": r[13] or [],
            } if r[7] else None,
        })

    return StandardResponse(success=True, data=result)
