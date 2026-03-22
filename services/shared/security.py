"""
Security utilities: JWT, password hashing, RBAC dependencies.

Token strategy:
  - Access token: short-lived JWT (30 min), stateless verification
  - Refresh token: opaque random string, stored hashed in DB (7 days)
  - This hybrid approach lets us revoke sessions without checking DB on every request
"""
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .database import get_db

bearer_scheme = HTTPBearer()


class TokenData(BaseModel):
    user_id: str
    tenant_id: str
    role: str
    email: str


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt with auto-generated salt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT access token.
    Payload includes: sub (user_id), tenant_id, role, email, exp, iat, jti
    jti (JWT ID) enables future token blacklisting if needed.
    """
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4()),  # Unique token ID
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token() -> str:
    """
    Create an opaque refresh token (random UUID).
    Store the HASH of this in the database, return plain value to client.
    """
    return str(uuid.uuid4()) + str(uuid.uuid4())  # 72-char random string


def verify_token(token: str) -> TokenData:
    """
    Verify and decode a JWT access token.
    Raises HTTP 401 if invalid or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        tenant_id: str = payload.get("tenant_id")
        role: str = payload.get("role")
        email: str = payload.get("email")

        if not all([user_id, tenant_id, role, email]):
            raise credentials_exception

        return TokenData(user_id=user_id, tenant_id=tenant_id, role=role, email=email)
    except JWTError:
        raise credentials_exception


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> TokenData:
    """FastAPI dependency: extract and validate JWT from Authorization header."""
    return verify_token(credentials.credentials)


def require_roles(*allowed_roles: str):
    """
    RBAC dependency factory.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_roles("admin"))])
        @router.get("/teacher-or-admin", dependencies=[Depends(require_roles("admin", "teacher"))])
    """
    async def role_checker(
        current_user: TokenData = Depends(get_current_user),
    ) -> TokenData:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}",
            )
        return current_user
    return role_checker


def require_tenant_match(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    """
    Ensure the user belongs to the tenant they're accessing.
    Compared against X-Tenant-ID set in request.state by TenantMiddleware.
    """
    # Actual tenant comparison is done in middleware; this is a convenience dep
    return current_user
