"""File upload router — stores files in MinIO and returns public URLs."""
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from ..shared.config import settings
from ..shared.schemas import StandardResponse
from ..shared.security import get_current_user

router = APIRouter(prefix="/api/v1/upload", tags=["Upload"])

ALLOWED_IMAGE = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_VIDEO = {"video/mp4", "video/webm", "video/quicktime"}
ALLOWED = ALLOWED_IMAGE | ALLOWED_VIDEO
MAX_SIZE = 50 * 1024 * 1024  # 50 MB


def _s3_client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL or None,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


@router.post("", response_model=StandardResponse[dict])
async def upload_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    """Upload a photo or video. Returns { url, filename, content_type }."""
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"File type '{file.content_type}' not allowed. Use image or video.")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max 50 MB.")

    ext = (file.filename or "file").rsplit(".", 1)[-1].lower()
    key = f"uploads/{current_user.tenant_id}/{uuid.uuid4()}.{ext}"

    try:
        s3 = _s3_client()
        s3.put_object(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Body=content,
            ContentType=file.content_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    base = settings.S3_ENDPOINT_URL or f"https://s3.{settings.AWS_REGION}.amazonaws.com"
    public_url = f"{base}/{settings.S3_BUCKET}/{key}"

    return StandardResponse.ok({
        "url": public_url,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
    })
