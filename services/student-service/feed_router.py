"""
Feed/Posts router — school-wide social feed with class/role-based visibility.
Endpoint prefix: /api/v1/feed
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.database import get_db
from ..shared.schemas import StandardResponse
from ..shared.security import get_current_user
from .models import Post, PostLike, PostVisibility
from .schemas import PostCreate, PostResponse

router = APIRouter(prefix="/api/v1/feed", tags=["Feed"])


def _can_see(post: Post, user_role: str, user_id: str, user_class_ids: list) -> bool:
    """Return True if the user is allowed to see this post."""
    # Admins and super_admins see everything
    if user_role in ("admin", "super_admin"):
        return True
    vis = post.visibility
    if vis == PostVisibility.ALL:
        return True
    if vis == PostVisibility.TEACHERS:
        return user_role == "teacher"
    if vis == PostVisibility.STUDENTS:
        return user_role == "student"
    if vis == PostVisibility.PARENTS:
        return user_role == "parent"
    if vis == PostVisibility.CLASS_SPECIFIC:
        if not post.tagged_class_ids:
            return True  # no tag = visible to all
        tagged = [str(c) for c in post.tagged_class_ids]
        # Admins and teachers in the tagged class see it; students in the class see it
        if user_role in ("admin", "super_admin"):
            return True
        return any(str(c) in tagged for c in user_class_ids)
    return False


async def _get_user_class_ids(db: AsyncSession, tenant_id: UUID, user_id: str, role: str) -> list:
    """Get class IDs relevant to this user (student's class, teacher's classes)."""
    from .models import Class, Student
    if role == "student":
        res = await db.execute(
            select(Student.class_id).where(
                and_(Student.tenant_id == tenant_id, Student.user_id == UUID(user_id))
            )
        )
        return [str(r) for r in res.scalars().all() if r]
    if role == "teacher":
        from .models import ClassSubject
        res = await db.execute(
            select(ClassSubject.class_id).where(
                and_(ClassSubject.tenant_id == tenant_id, ClassSubject.teacher_id == UUID(user_id))
            )
        )
        return [str(r) for r in res.scalars().all()]
    return []


@router.get("", response_model=StandardResponse[dict])
async def get_feed(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    post_type: Optional[str] = Query(None),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the social feed, filtered by the current user's role and class memberships."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    query = select(Post).where(Post.tenant_id == tid).order_by(Post.created_at.desc())
    if post_type:
        query = query.where(Post.post_type == post_type)

    result = await db.execute(query)
    all_posts = result.scalars().all()

    user_class_ids = await _get_user_class_ids(db, tid, current_user.user_id, current_user.role)

    # Filter by visibility
    visible = [p for p in all_posts if _can_see(p, current_user.role, current_user.user_id, user_class_ids)]

    # Get likes by current user
    liked_post_ids: set = set()
    if visible:
        like_res = await db.execute(
            select(PostLike.post_id).where(
                and_(
                    PostLike.tenant_id == tid,
                    PostLike.user_id == UUIDT(current_user.user_id),
                )
            )
        )
        liked_post_ids = {str(r) for r in like_res.scalars().all()}

    # Paginate
    total = len(visible)
    start = (page - 1) * per_page
    page_items = visible[start: start + per_page]

    def to_resp(p: Post) -> PostResponse:
        return PostResponse(
            id=p.id,
            tenant_id=p.tenant_id,
            author_id=p.author_id,
            author_name=p.author_name,
            author_role=p.author_role,
            title=p.title,
            content=p.content,
            post_type=p.post_type.value if hasattr(p.post_type, "value") else p.post_type,
            visibility=p.visibility.value if hasattr(p.visibility, "value") else p.visibility,
            tagged_class_ids=p.tagged_class_ids,
            attachment_urls=p.attachment_urls,
            likes_count=p.likes_count,
            comments_count=p.comments_count,
            created_at=p.created_at.isoformat() if p.created_at else "",
            liked_by_me=str(p.id) in liked_post_ids,
        )

    return StandardResponse.ok({
        "items": [to_resp(p).model_dump() for p in page_items],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page if per_page else 1,
    })


@router.post("", response_model=StandardResponse[PostResponse], status_code=201)
async def create_post(
    body: PostCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new post in the feed."""
    from uuid import UUID as UUIDT

    # Only admins and teachers can post
    if current_user.role not in ("admin", "super_admin", "teacher"):
        raise HTTPException(status_code=403, detail="Only admins and teachers can create posts")

    tid = UUIDT(current_user.tenant_id)
    post = Post(
        tenant_id=tid,
        author_id=UUIDT(current_user.user_id),
        author_name=current_user.email.split("@")[0],  # fallback name from email
        author_role=current_user.role,
        title=body.title,
        content=body.content,
        post_type=body.post_type,
        visibility=body.visibility,
        tagged_class_ids=body.tagged_class_ids,
        attachment_urls=body.attachment_urls,
    )
    db.add(post)
    await db.flush()

    resp = PostResponse(
        id=post.id,
        tenant_id=post.tenant_id,
        author_id=post.author_id,
        author_name=post.author_name,
        author_role=post.author_role,
        title=post.title,
        content=post.content,
        post_type=post.post_type.value if hasattr(post.post_type, "value") else post.post_type,
        visibility=post.visibility.value if hasattr(post.visibility, "value") else post.visibility,
        tagged_class_ids=post.tagged_class_ids,
        attachment_urls=post.attachment_urls,
        likes_count=0,
        comments_count=0,
        created_at=post.created_at.isoformat() if post.created_at else "",
        liked_by_me=False,
    )
    return StandardResponse.ok(resp)


@router.post("/{post_id}/like", response_model=StandardResponse[dict])
async def toggle_like(
    post_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Toggle like on a post."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)
    uid = UUIDT(current_user.user_id)

    post_res = await db.execute(select(Post).where(and_(Post.id == post_id, Post.tenant_id == tid)))
    post = post_res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    like_res = await db.execute(
        select(PostLike).where(and_(PostLike.post_id == post_id, PostLike.user_id == uid, PostLike.tenant_id == tid))
    )
    existing = like_res.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        db.add(PostLike(tenant_id=tid, post_id=post_id, user_id=uid, user_role=current_user.role))
        post.likes_count += 1
        liked = True

    return StandardResponse.ok({"liked": liked, "likes_count": post.likes_count})


@router.delete("/{post_id}", response_model=StandardResponse[dict])
async def delete_post(
    post_id: UUID,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a post (author or admin only)."""
    from uuid import UUID as UUIDT
    tid = UUIDT(current_user.tenant_id)

    res = await db.execute(select(Post).where(and_(Post.id == post_id, Post.tenant_id == tid)))
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if str(post.author_id) != current_user.user_id and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    await db.delete(post)
    return StandardResponse.ok({"message": "Post deleted"})
