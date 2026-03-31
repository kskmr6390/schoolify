"""Student service API router."""
import csv
import io
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.database import get_db
from ..shared.events import Topics, event_producer
from ..shared.schemas import PaginatedResponse, PaginationParams, StandardResponse
from ..shared.security import get_current_user, require_roles
from .models import (AcademicYear, Class, ClassSubject, Parent, Student,
                     StudentDocument, StudentStatus, Subject, TimetableSlot)
from .schemas import (AcademicYearCreate, AcademicYearResponse, ClassCreate,
                      ClassResponse, ParentCreate, ParentResponse, StudentCreate,
                      StudentResponse, StudentUpdate, SubjectCreate,
                      SubjectResponse, TimetableSlotCreate, TimetableSlotResponse)

router = APIRouter(prefix="/api/v1", tags=["Students"])


# ── Academic Years ─────────────────────────────────────────────────────────────

@router.get("/academic-years", response_model=StandardResponse[list[AcademicYearResponse]])
async def list_academic_years(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    result = await db.execute(
        select(AcademicYear).where(AcademicYear.tenant_id == UUIDT(current_user.tenant_id))
        .order_by(AcademicYear.start_date.desc())
    )
    years = result.scalars().all()
    return StandardResponse.ok([AcademicYearResponse.model_validate(y) for y in years])


@router.post("/academic-years", response_model=StandardResponse[AcademicYearResponse], status_code=201)
async def create_academic_year(
    body: AcademicYearCreate,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    year = AcademicYear(tenant_id=UUIDT(current_user.tenant_id), **body.model_dump())
    db.add(year)
    await db.flush()
    return StandardResponse.ok(AcademicYearResponse.model_validate(year))


@router.post("/academic-years/{year_id}/set-current", response_model=StandardResponse[dict])
async def set_current_academic_year(
    year_id: UUID,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    # Unset all
    result = await db.execute(select(AcademicYear).where(AcademicYear.tenant_id == tid))
    for y in result.scalars().all():
        y.is_current = (y.id == year_id)
    return StandardResponse.ok({"message": "Current academic year updated"})


# ── Classes ────────────────────────────────────────────────────────────────────

@router.get("/classes", response_model=StandardResponse[list[ClassResponse]])
async def list_classes(
    academic_year_id: Optional[UUID] = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    query = select(Class).where(Class.tenant_id == UUIDT(current_user.tenant_id))
    if academic_year_id:
        query = query.where(Class.academic_year_id == academic_year_id)
    result = await db.execute(query.order_by(Class.grade, Class.section))
    return StandardResponse.ok([ClassResponse.model_validate(c) for c in result.scalars().all()])


@router.post("/classes", response_model=StandardResponse[ClassResponse], status_code=201)
async def create_class(
    body: ClassCreate,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    class_ = Class(tenant_id=UUIDT(current_user.tenant_id), **body.model_dump())
    db.add(class_)
    await db.flush()
    return StandardResponse.ok(ClassResponse.model_validate(class_))


@router.patch("/classes/{class_id}", response_model=StandardResponse[ClassResponse])
async def update_class(
    class_id: UUID,
    body: ClassCreate,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    res = await db.execute(select(Class).where(
        Class.id == class_id, Class.tenant_id == UUIDT(current_user.tenant_id)
    ))
    cls = res.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(cls, k, v)
    await db.flush()
    return StandardResponse.ok(ClassResponse.model_validate(cls))


@router.delete("/classes/{class_id}", response_model=StandardResponse[dict])
async def delete_class(
    class_id: UUID,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    res = await db.execute(select(Class).where(
        Class.id == class_id, Class.tenant_id == UUIDT(current_user.tenant_id)
    ))
    cls = res.scalar_one_or_none()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    await db.delete(cls)
    return StandardResponse.ok({"deleted": True})


@router.get("/classes/{class_id}/students", response_model=StandardResponse[list[StudentResponse]])
async def get_class_students(
    class_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    result = await db.execute(
        select(Student).where(
            and_(Student.class_id == class_id, Student.tenant_id == UUIDT(current_user.tenant_id),
                 Student.status == StudentStatus.ACTIVE)
        ).order_by(Student.roll_number)
    )
    return StandardResponse.ok([StudentResponse.model_validate(s) for s in result.scalars().all()])


@router.get("/classes/{class_id}/timetable", response_model=StandardResponse[list[TimetableSlotResponse]])
async def get_class_timetable(
    class_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TimetableSlot).where(TimetableSlot.class_id == class_id)
        .order_by(TimetableSlot.day_of_week, TimetableSlot.start_time)
    )
    return StandardResponse.ok([TimetableSlotResponse.model_validate(t) for t in result.scalars().all()])


# ── Subjects ───────────────────────────────────────────────────────────────────

@router.get("/subjects", response_model=StandardResponse[list[SubjectResponse]])
async def list_subjects(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    result = await db.execute(
        select(Subject).where(
            and_(Subject.tenant_id == UUIDT(current_user.tenant_id), Subject.is_active == True)
        )
    )
    return StandardResponse.ok([SubjectResponse.model_validate(s) for s in result.scalars().all()])


@router.post("/subjects", response_model=StandardResponse[SubjectResponse], status_code=201)
async def create_subject(
    body: SubjectCreate,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    subject = Subject(tenant_id=UUIDT(current_user.tenant_id), **body.model_dump())
    db.add(subject)
    await db.flush()
    return StandardResponse.ok(SubjectResponse.model_validate(subject))


# ── Timetable ──────────────────────────────────────────────────────────────────

@router.post("/timetable", response_model=StandardResponse[TimetableSlotResponse], status_code=201)
async def create_timetable_slot(
    body: TimetableSlotCreate,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    slot = TimetableSlot(tenant_id=UUIDT(current_user.tenant_id), **body.model_dump())
    db.add(slot)
    await db.flush()
    return StandardResponse.ok(TimetableSlotResponse.model_validate(slot))


# ── Students ───────────────────────────────────────────────────────────────────

@router.get("/students", response_model=StandardResponse[PaginatedResponse[StudentResponse]])
async def list_students(
    params: PaginationParams = Depends(),
    class_id: Optional[UUID] = Query(None),
    grade: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    query = select(Student).where(Student.tenant_id == tid)

    if class_id:
        query = query.where(Student.class_id == class_id)
    if status:
        query = query.where(Student.status == status)
    if search:
        query = query.where(
            (Student.first_name.ilike(f"%{search}%")) |
            (Student.last_name.ilike(f"%{search}%")) |
            (Student.student_code.ilike(f"%{search}%"))
        )

    # Join with Class for grade filtering
    if grade:
        query = query.join(Class, Student.class_id == Class.id).where(Class.grade == grade)

    count_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = count_result.scalar()

    query = query.offset(params.offset).limit(params.limit).order_by(Student.first_name)
    result = await db.execute(query)

    return StandardResponse.ok(PaginatedResponse.create(
        items=[StudentResponse.model_validate(s) for s in result.scalars().all()],
        total=total, page=params.page, limit=params.limit,
    ))


@router.post("/students", response_model=StandardResponse[StudentResponse], status_code=201)
async def create_student(
    body: StudentCreate,
    current_user=Depends(require_roles("admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    # Auto-generate student code: SCH-{YEAR}-{SEQ}
    year = date.today().year
    count_result = await db.execute(
        select(func.count(Student.id)).where(Student.tenant_id == tid)
    )
    count = count_result.scalar() + 1
    student_code = f"SCH-{year}-{count:04d}"

    student = Student(
        tenant_id=tid,
        student_code=student_code,
        **body.model_dump(),
    )
    db.add(student)
    await db.flush()

    # Publish enrollment event
    await event_producer.publish(
        Topics.STUDENT_ENROLLED, "student.enrolled", str(tid),
        {"student_id": str(student.id), "student_code": student_code, "class_id": str(body.class_id) if body.class_id else None}
    )

    return StandardResponse.ok(StudentResponse.model_validate(student))


@router.get("/students/me", response_model=StandardResponse[StudentResponse])
async def get_my_student_profile(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the student record for the currently logged-in student user."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    uid = UUIDT(current_user.user_id)

    result = await db.execute(
        select(Student).where(
            Student.user_id == uid,
            Student.tenant_id == tid,
        )
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return StandardResponse.ok(StudentResponse.model_validate(student))


@router.get("/students/{student_id}", response_model=StandardResponse[StudentResponse])
async def get_student(
    student_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    result = await db.execute(
        select(Student).where(and_(Student.id == student_id, Student.tenant_id == UUIDT(current_user.tenant_id)))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return StandardResponse.ok(StudentResponse.model_validate(student))


@router.put("/students/{student_id}", response_model=StandardResponse[StudentResponse])
async def update_student(
    student_id: UUID,
    body: StudentUpdate,
    current_user=Depends(require_roles("admin", "teacher")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    result = await db.execute(
        select(Student).where(and_(Student.id == student_id, Student.tenant_id == UUIDT(current_user.tenant_id)))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for field, value in body.model_dump(exclude_none=True).items():
        if isinstance(value, dict):
            setattr(student, field, value)  # JSONB fields
        else:
            setattr(student, field, value)

    return StandardResponse.ok(StudentResponse.model_validate(student))


@router.delete("/students/{student_id}", response_model=StandardResponse[dict])
async def delete_student(
    student_id: UUID,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    result = await db.execute(
        select(Student).where(and_(Student.id == student_id, Student.tenant_id == UUIDT(current_user.tenant_id)))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.status = StudentStatus.INACTIVE
    return StandardResponse.ok({"message": "Student deactivated"})


@router.post("/students/bulk-import", response_model=StandardResponse[dict])
async def bulk_import_students(
    file: UploadFile = File(...),
    class_id: Optional[UUID] = Query(None),
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Import students from CSV file.
    Expected columns: first_name, last_name, dob, gender, roll_number, blood_group
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8")))

    imported = 0
    errors = []
    year = date.today().year

    for i, row in enumerate(reader, start=2):  # Row 2 (header is row 1)
        try:
            count_result = await db.execute(select(func.count(Student.id)).where(Student.tenant_id == tid))
            count = count_result.scalar() + 1

            student = Student(
                tenant_id=tid,
                student_code=f"SCH-{year}-{count:04d}",
                first_name=row["first_name"].strip(),
                last_name=row["last_name"].strip(),
                enrollment_date=date.today(),
                class_id=class_id,
                roll_number=int(row.get("roll_number", 0)) or None,
                blood_group=row.get("blood_group", "").strip() or None,
            )
            db.add(student)
            imported += 1
        except Exception as e:
            errors.append({"row": i, "error": str(e)})

    return StandardResponse.ok({
        "imported": imported,
        "errors": errors,
        "total_rows": imported + len(errors),
    })


# ── Parents ────────────────────────────────────────────────────────────────────

@router.get("/parents/student/{student_id}", response_model=StandardResponse[list[ParentResponse]])
async def get_student_parents(
    student_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Parent).where(Parent.student_id == student_id))
    return StandardResponse.ok([ParentResponse.model_validate(p) for p in result.scalars().all()])


@router.post("/parents", response_model=StandardResponse[ParentResponse], status_code=201)
async def create_parent(
    body: ParentCreate,
    current_user=Depends(require_roles("admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    parent = Parent(tenant_id=UUIDT(current_user.tenant_id), **body.model_dump())
    db.add(parent)
    await db.flush()
    return StandardResponse.ok(ParentResponse.model_validate(parent))
