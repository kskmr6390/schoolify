"""Assignment and Exam service router."""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.database import get_db
from ..shared.events import Topics, event_producer
from ..shared.schemas import PaginatedResponse, PaginationParams, StandardResponse
from ..shared.security import get_current_user, require_roles
from .models import (Assignment, AssignmentType, Exam, ExamResult, Submission,
                     SubmissionStatus)

router = APIRouter(prefix="/api/v1", tags=["Assignments & Exams"])


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    class_id: UUID
    subject_id: UUID
    title: str
    description: Optional[str] = None
    due_date: datetime
    max_marks: Decimal = Field(default=100)
    assignment_type: str = "homework"
    allow_late_submission: bool = False


class AssignmentResponse(BaseModel):
    id: UUID
    class_id: UUID
    subject_id: UUID
    teacher_id: UUID
    title: str
    description: Optional[str]
    due_date: datetime
    max_marks: Decimal
    assignment_type: str
    is_published: bool
    model_config = {"from_attributes": True}


class SubmitAssignmentRequest(BaseModel):
    file_urls: List[str] = []
    text_response: Optional[str] = None


class GradeSubmissionRequest(BaseModel):
    marks_obtained: Decimal
    feedback: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: UUID
    assignment_id: UUID
    student_id: UUID
    submitted_at: Optional[datetime]
    marks_obtained: Optional[Decimal]
    feedback: Optional[str]
    status: str
    model_config = {"from_attributes": True}


class ExamCreate(BaseModel):
    class_id: UUID
    subject_id: UUID
    academic_year_id: UUID
    name: str
    exam_type: str
    exam_date: datetime
    duration_minutes: int = 60
    max_marks: Decimal
    passing_marks: Optional[Decimal] = None
    instructions: Optional[str] = None


class ExamResponse(BaseModel):
    id: UUID
    class_id: UUID
    subject_id: UUID
    name: str
    exam_type: str
    exam_date: datetime
    max_marks: Decimal
    is_published: bool
    results_published: bool
    model_config = {"from_attributes": True}


class ExamResultInput(BaseModel):
    student_id: UUID
    marks_obtained: Decimal


class ExamResultResponse(BaseModel):
    id: UUID
    exam_id: UUID
    student_id: UUID
    marks_obtained: Decimal
    grade: Optional[str]
    grade_points: Optional[Decimal]
    is_pass: Optional[bool]
    model_config = {"from_attributes": True}


# ── Assignments ────────────────────────────────────────────────────────────────

@router.post("/assignments", response_model=StandardResponse[AssignmentResponse], status_code=201)
async def create_assignment(
    body: AssignmentCreate,
    current_user=Depends(require_roles("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    assignment = Assignment(
        tenant_id=tid,
        teacher_id=UUIDT(current_user.user_id),
        **body.model_dump(),
    )
    db.add(assignment)
    await db.flush()
    return StandardResponse.ok(AssignmentResponse.model_validate(assignment))


@router.get("/assignments", response_model=StandardResponse[list[AssignmentResponse]])
async def list_assignments(
    class_id: Optional[UUID] = Query(None),
    subject_id: Optional[UUID] = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    query = select(Assignment).where(Assignment.tenant_id == tid)

    if class_id:
        query = query.where(Assignment.class_id == class_id)
    if subject_id:
        query = query.where(Assignment.subject_id == subject_id)

    # Students only see published assignments
    if current_user.role == "student":
        query = query.where(Assignment.is_published == True)

    result = await db.execute(query.order_by(Assignment.due_date.asc()))
    return StandardResponse.ok([AssignmentResponse.model_validate(a) for a in result.scalars().all()])


@router.post("/assignments/{assignment_id}/publish", response_model=StandardResponse[AssignmentResponse])
async def publish_assignment(
    assignment_id: UUID,
    current_user=Depends(require_roles("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    result = await db.execute(
        select(Assignment).where(and_(Assignment.id == assignment_id, Assignment.tenant_id == tid))
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.is_published = True
    assignment.published_at = datetime.utcnow()

    # Notify students
    await event_producer.publish(
        Topics.ASSIGNMENT_PUBLISHED, "assignment.published", str(tid),
        {"assignment_id": str(assignment_id), "class_id": str(assignment.class_id), "due_date": str(assignment.due_date)}
    )

    return StandardResponse.ok(AssignmentResponse.model_validate(assignment))


@router.post("/assignments/{assignment_id}/submissions", response_model=StandardResponse[SubmissionResponse], status_code=201)
async def submit_assignment(
    assignment_id: UUID,
    body: SubmitAssignmentRequest,
    current_user=Depends(require_roles("student")),
    db: AsyncSession = Depends(get_db),
):
    """Student submits an assignment."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    student_id = UUIDT(current_user.user_id)

    # Check assignment exists and is published
    result = await db.execute(
        select(Assignment).where(and_(Assignment.id == assignment_id, Assignment.tenant_id == tid))
    )
    assignment = result.scalar_one_or_none()
    if not assignment or not assignment.is_published:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Check for existing submission
    existing = await db.execute(
        select(Submission).where(
            and_(Submission.assignment_id == assignment_id, Submission.student_id == student_id)
        )
    )
    submission = existing.scalar_one_or_none()

    if submission:
        # Update existing
        submission.file_urls = body.file_urls
        submission.text_response = body.text_response
        submission.submitted_at = datetime.utcnow()
        is_late = datetime.utcnow() > assignment.due_date
        submission.status = SubmissionStatus.LATE if is_late else SubmissionStatus.SUBMITTED
    else:
        is_late = datetime.utcnow() > assignment.due_date
        submission = Submission(
            tenant_id=tid,
            assignment_id=assignment_id,
            student_id=student_id,
            file_urls=body.file_urls,
            text_response=body.text_response,
            submitted_at=datetime.utcnow(),
            status=SubmissionStatus.LATE if is_late else SubmissionStatus.SUBMITTED,
        )
        db.add(submission)

    await db.flush()
    return StandardResponse.ok(SubmissionResponse.model_validate(submission))


@router.get("/assignments/{assignment_id}/submissions", response_model=StandardResponse[list[SubmissionResponse]])
async def get_submissions(
    assignment_id: UUID,
    current_user=Depends(require_roles("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Submission).where(Submission.assignment_id == assignment_id)
    )
    return StandardResponse.ok([SubmissionResponse.model_validate(s) for s in result.scalars().all()])


@router.put("/submissions/{submission_id}/grade", response_model=StandardResponse[SubmissionResponse])
async def grade_submission(
    submission_id: UUID,
    body: GradeSubmissionRequest,
    current_user=Depends(require_roles("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    submission = await db.get(Submission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission.marks_obtained = body.marks_obtained
    submission.feedback = body.feedback
    submission.status = SubmissionStatus.GRADED
    submission.graded_by = UUIDT(current_user.user_id)
    submission.graded_at = datetime.utcnow()

    await event_producer.publish(
        Topics.SUBMISSION_GRADED, "submission.graded",
        str(submission.tenant_id),
        {"submission_id": str(submission_id), "student_id": str(submission.student_id)}
    )

    return StandardResponse.ok(SubmissionResponse.model_validate(submission))


# ── Exams ──────────────────────────────────────────────────────────────────────

@router.post("/exams", response_model=StandardResponse[ExamResponse], status_code=201)
async def create_exam(
    body: ExamCreate,
    current_user=Depends(require_roles("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    exam = Exam(tenant_id=tid, **body.model_dump())
    db.add(exam)
    await db.flush()
    return StandardResponse.ok(ExamResponse.model_validate(exam))


@router.get("/exams", response_model=StandardResponse[list[ExamResponse]])
async def list_exams(
    class_id: Optional[UUID] = Query(None),
    academic_year_id: Optional[UUID] = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    query = select(Exam).where(Exam.tenant_id == tid)
    if class_id:
        query = query.where(Exam.class_id == class_id)
    if academic_year_id:
        query = query.where(Exam.academic_year_id == academic_year_id)
    if current_user.role == "student":
        query = query.where(Exam.is_published == True)

    result = await db.execute(query.order_by(Exam.exam_date))
    return StandardResponse.ok([ExamResponse.model_validate(e) for e in result.scalars().all()])


@router.post("/exams/{exam_id}/results/bulk", response_model=StandardResponse[dict])
async def bulk_enter_results(
    exam_id: UUID,
    results: List[ExamResultInput],
    current_user=Depends(require_roles("teacher", "admin")),
    db: AsyncSession = Depends(get_db),
):
    """Bulk enter exam results with automatic grade calculation."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    def calculate_grade(marks: Decimal, max_marks: Decimal):
        """Calculate letter grade from percentage."""
        pct = float(marks / max_marks * 100)
        if pct >= 90: return "A+", 10.0
        if pct >= 80: return "A", 9.0
        if pct >= 70: return "B+", 8.0
        if pct >= 60: return "B", 7.0
        if pct >= 50: return "C", 6.0
        if pct >= 40: return "D", 5.0
        return "F", 0.0

    entered = 0
    for result_input in results:
        grade, grade_points = calculate_grade(result_input.marks_obtained, exam.max_marks)
        passing = exam.passing_marks or (exam.max_marks * Decimal("0.4"))

        # Upsert result
        existing = await db.execute(
            select(ExamResult).where(
                and_(ExamResult.exam_id == exam_id, ExamResult.student_id == result_input.student_id)
            )
        )
        result_record = existing.scalar_one_or_none()
        if result_record:
            result_record.marks_obtained = result_input.marks_obtained
            result_record.grade = grade
            result_record.grade_points = Decimal(str(grade_points))
            result_record.is_pass = result_input.marks_obtained >= passing
        else:
            db.add(ExamResult(
                tenant_id=tid,
                exam_id=exam_id,
                student_id=result_input.student_id,
                marks_obtained=result_input.marks_obtained,
                grade=grade,
                grade_points=Decimal(str(grade_points)),
                is_pass=result_input.marks_obtained >= passing,
                entered_by=UUIDT(current_user.user_id),
            ))
        entered += 1

    return StandardResponse.ok({"entered": entered, "exam_id": str(exam_id)})


@router.get("/exams/{exam_id}/results", response_model=StandardResponse[list[ExamResultResponse]])
async def get_exam_results(
    exam_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ExamResult).where(ExamResult.exam_id == exam_id)
        .order_by(ExamResult.marks_obtained.desc())
    )
    return StandardResponse.ok([ExamResultResponse.model_validate(r) for r in result.scalars().all()])


@router.get("/results", response_model=StandardResponse[list])
async def get_my_results(
    academic_year_id: Optional[UUID] = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get exam results for the current user (student) or all results (admin/teacher)."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    query = (
        select(ExamResult, Exam)
        .join(Exam, ExamResult.exam_id == Exam.id)
        .where(Exam.tenant_id == tid)
    )
    if current_user.role == "student":
        # Find student record linked to this user
        from sqlalchemy import text
        student_res = await db.execute(
            text("SELECT id FROM students WHERE user_id=:uid AND tenant_id=:tid LIMIT 1"),
            {"uid": UUIDT(current_user.user_id), "tid": tid}
        )
        row = student_res.fetchone()
        if not row:
            return StandardResponse.ok([])
        query = query.where(ExamResult.student_id == row[0])
    if academic_year_id:
        query = query.where(Exam.academic_year_id == academic_year_id)
    result = await db.execute(query.order_by(Exam.exam_date.desc()))
    rows = result.all()
    items = []
    for er, exam in rows:
        items.append({
            "id": str(er.id),
            "exam_id": str(er.exam_id),
            "exam_name": exam.name,
            "exam_type": exam.exam_type.value if hasattr(exam.exam_type, "value") else str(exam.exam_type),
            "exam_date": exam.exam_date.isoformat() if exam.exam_date else None,
            "student_id": str(er.student_id),
            "marks_obtained": float(er.marks_obtained),
            "max_marks": float(exam.max_marks),
            "grade": er.grade,
            "grade_points": float(er.grade_points) if er.grade_points else None,
            "is_pass": er.is_pass,
            "remarks": er.remarks,
        })
    return StandardResponse.ok(items)


@router.get("/results/student/{student_id}", response_model=StandardResponse[list[ExamResultResponse]])
async def get_student_results(
    student_id: UUID,
    academic_year_id: Optional[UUID] = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(ExamResult).join(Exam, ExamResult.exam_id == Exam.id).where(
        ExamResult.student_id == student_id
    )
    if academic_year_id:
        query = query.where(Exam.academic_year_id == academic_year_id)

    result = await db.execute(query.order_by(Exam.exam_date.desc()))
    return StandardResponse.ok([ExamResultResponse.model_validate(r) for r in result.scalars().all()])
