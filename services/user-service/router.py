from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from uuid import UUID
from typing import Optional

from services.shared.database import get_db
from services.shared.security import get_current_user, require_roles, TokenData
from services.shared.schemas import StandardResponse
from services.user_service.models import UserProfile, StaffProfile, ParentStudentLink
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


# ─── Chat Users ───────────────────────────────────────────────────────────────

@router.get("/chat-users", response_model=StandardResponse)
async def list_chat_users(
    current_user: TokenData = Depends(require_roles("admin", "super_admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    """Return all active staff users (excluding self) available to chat with."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    uid = UUIDT(current_user.user_id)

    rows = (await db.execute(text("""
        SELECT u.id, u.first_name, u.last_name, u.email, LOWER(u.role::text) AS role
        FROM users u
        WHERE u.tenant_id = :tid
          AND u.id != :uid
          AND LOWER(u.role::text) IN ('teacher', 'admin', 'super_admin')
          AND u.status = 'active'
        ORDER BY u.first_name, u.last_name
    """), {"tid": tid, "uid": uid})).fetchall()

    return StandardResponse(success=True, data=[
        {"id": str(r[0]), "name": f"{r[1]} {r[2]}".strip(), "email": r[3], "role": r[4]}
        for r in rows
    ])


# ── Parent-Student Links ───────────────────────────────────────────────────────

class ParentLinkRequest(BaseModel):
    parent_id: str
    student_id: str
    relationship: str = "parent"


@router.post("/parent-links", response_model=StandardResponse, status_code=201)
async def create_parent_link(
    payload: ParentLinkRequest,
    current_user: TokenData = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    """Link a parent user to a student. Creates the parent account if it doesn't exist."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    parent_id = UUIDT(payload.parent_id)
    student_id = UUIDT(payload.student_id)

    # Check duplicate
    existing = await db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.student_id == student_id,
            ParentStudentLink.tenant_id == tid,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Link already exists")

    link = ParentStudentLink(
        tenant_id=tid,
        parent_id=parent_id,
        student_id=student_id,
        relationship=payload.relationship,
    )
    db.add(link)
    await db.commit()
    return StandardResponse(success=True, data={
        "parent_id": str(parent_id),
        "student_id": str(student_id),
        "relationship": payload.relationship,
    })


@router.get("/parent-links/my-children", response_model=StandardResponse)
async def get_my_children(
    current_user: TokenData = Depends(require_roles("parent")),
    db: AsyncSession = Depends(get_db),
):
    """Get all students linked to the current parent user."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    parent_id = UUIDT(current_user.user_id)

    links = await db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == parent_id,
            ParentStudentLink.tenant_id == tid,
        )
    )
    link_rows = links.scalars().all()
    if not link_rows:
        return StandardResponse(success=True, data=[])

    student_ids = [str(lnk.student_id) for lnk in link_rows]
    rel_map = {str(lnk.student_id): lnk.relationship for lnk in link_rows}

    rows = (await db.execute(text("""
        SELECT s.id, s.first_name, s.last_name, u.email, s.status::text,
               s.student_code, s.class_id, s.grade, c.name AS class_name
        FROM students s
        LEFT JOIN classes c ON c.id = s.class_id AND c.tenant_id = :tid
        LEFT JOIN users u ON u.id = s.user_id AND u.tenant_id = :tid
        WHERE s.tenant_id = :tid AND s.id = ANY(:ids)
        ORDER BY s.first_name, s.last_name
    """), {"tid": tid, "ids": [UUIDT(sid) for sid in student_ids]})).fetchall()

    result = []
    for r in rows:
        sid = str(r[0])
        result.append({
            "id": sid,
            "first_name": r[1],
            "last_name": r[2],
            "email": r[3],
            "status": r[4],
            "student_code": r[5],
            "class_id": str(r[6]) if r[6] else None,
            "grade": str(r[7]) if r[7] is not None else None,
            "class_name": r[8],
            "relationship": rel_map.get(sid, "parent"),
        })
    return StandardResponse(success=True, data=result)


@router.get("/parent-links/{student_id}/parents", response_model=StandardResponse)
async def get_student_parents(
    student_id: UUID,
    current_user: TokenData = Depends(require_roles("admin", "super_admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    """Get all parents linked to a specific student."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    links = await db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.student_id == student_id,
            ParentStudentLink.tenant_id == tid,
        )
    )
    link_rows = links.scalars().all()
    if not link_rows:
        return StandardResponse(success=True, data=[])

    parent_ids = [lnk.parent_id for lnk in link_rows]
    rel_map = {str(lnk.parent_id): lnk.relationship for lnk in link_rows}

    rows = (await db.execute(text("""
        SELECT u.id, u.first_name, u.last_name, u.email, u.status::text
        FROM users u
        WHERE u.tenant_id = :tid AND u.id = ANY(:ids)
        ORDER BY u.first_name
    """), {"tid": tid, "ids": parent_ids})).fetchall()

    return StandardResponse(success=True, data=[
        {
            "id": str(r[0]),
            "first_name": r[1],
            "last_name": r[2],
            "email": r[3],
            "status": r[4],
            "relationship": rel_map.get(str(r[0]), "parent"),
        }
        for r in rows
    ])


@router.delete("/parent-links", response_model=StandardResponse)
async def delete_parent_link(
    parent_id: str,
    student_id: str,
    current_user: TokenData = Depends(require_roles("admin", "super_admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(
        select(ParentStudentLink).where(
            ParentStudentLink.parent_id == UUIDT(parent_id),
            ParentStudentLink.student_id == UUIDT(student_id),
            ParentStudentLink.tenant_id == tid,
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=404, detail="Link not found")
    await db.delete(link)
    await db.commit()
    return StandardResponse(success=True, data={"message": "Link removed"})


@router.get("/students-list", response_model=StandardResponse)
async def list_students(
    current_user: TokenData = Depends(require_roles("admin", "super_admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    """Return all students for award/parent-link selection, queried from the students table."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    rows = (await db.execute(text("""
        SELECT
            s.id,
            s.first_name,
            s.last_name,
            s.student_code,
            c.grade,
            c.name  AS class_name,
            u.email
        FROM students s
        LEFT JOIN classes  c ON c.id = s.class_id  AND c.tenant_id = :tid
        LEFT JOIN users    u ON u.id = s.user_id   AND u.tenant_id = :tid
        WHERE s.tenant_id = :tid
          AND s.status = 'active'
        ORDER BY s.first_name, s.last_name
    """), {"tid": tid})).fetchall()

    return StandardResponse(success=True, data=[
        {
            "id": str(r[0]),
            "first_name": r[1],
            "last_name": r[2],
            "name": f"{r[1]} {r[2]}".strip(),
            "student_code": r[3],
            "grade": str(r[4]) if r[4] is not None else None,
            "class_name": r[5],
            "email": r[6],
        }
        for r in rows
    ])
