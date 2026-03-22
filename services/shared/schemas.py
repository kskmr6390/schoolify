"""
Common Pydantic schemas shared across all services.
Provides consistent API response shapes and pagination.
"""
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

DataT = TypeVar("DataT")


class StandardResponse(BaseModel, Generic[DataT]):
    """
    Unified API response envelope.
    Every endpoint returns this structure for consistency.

    Example:
        {"success": true, "data": {...}, "meta": null, "errors": null}
    """
    success: bool = True
    data: Optional[DataT] = None
    meta: Optional[dict] = None
    errors: Optional[List["ErrorDetail"]] = None

    @classmethod
    def ok(cls, data: DataT, meta: Optional[dict] = None):
        return cls(success=True, data=data, meta=meta)

    @classmethod
    def fail(cls, errors: List["ErrorDetail"]):
        return cls(success=False, errors=errors)


class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number (1-indexed)")
    limit: int = Field(default=20, ge=1, le=100, description="Items per page")
    sort_by: Optional[str] = None
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PaginatedResponse(BaseModel, Generic[DataT]):
    items: List[DataT]
    total: int
    page: int
    limit: int
    pages: int

    @classmethod
    def create(cls, items: List[DataT], total: int, page: int, limit: int):
        import math
        return cls(
            items=items,
            total=total,
            page=page,
            limit=limit,
            pages=math.ceil(total / limit) if limit > 0 else 0,
        )


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str
    version: str = "1.0.0"
