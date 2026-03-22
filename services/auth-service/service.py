"""
Auth business logic service.
Handles login, registration, token management, and OAuth.
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..shared.config import settings
from ..shared.events import Topics, event_producer
from ..shared.redis_client import cache_delete, cache_set, set_with_lock
from ..shared.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from .models import AuditLog, OAuthAccount, OAuthProvider, RefreshToken, User, UserStatus
from .schemas import LoginResponse, RegisterRequest, TokenResponse, UserProfile


def _hash_token(token: str) -> str:
    """SHA-256 hash a refresh token before storing."""
    return hashlib.sha256(token.encode()).hexdigest()


class AuthService:

    async def login(
        self,
        email: str,
        password: str,
        tenant_id: uuid.UUID,
        db: AsyncSession,
        ip_address: str = None,
    ) -> LoginResponse:
        """Authenticate user with email/password."""
        result = await db.execute(
            select(User).where(
                and_(User.email == email.lower(), User.tenant_id == tenant_id)
            )
        )
        user = result.scalar_one_or_none()

        if not user or not user.password_hash or not verify_password(password, user.password_hash):
            await self._audit(db, None, tenant_id, "LOGIN_FAILED", "users", ip_address=ip_address, success=False)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if user.status == UserStatus.SUSPENDED:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended")

        if user.status == UserStatus.INACTIVE:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

        # Update last login
        user.last_login = datetime.utcnow()

        # Issue tokens
        access_token = self._create_access_token(user)
        refresh_token_plain = await self._create_refresh_token(user, db, ip_address)

        await self._audit(db, user.id, tenant_id, "LOGIN", "users", ip_address=ip_address)

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token_plain,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserProfile.model_validate(user),
        )

    async def register(
        self,
        data: RegisterRequest,
        tenant_id: uuid.UUID,
        db: AsyncSession,
    ) -> UserProfile:
        """Register a new user."""
        # Check duplicate email
        result = await db.execute(
            select(User).where(and_(User.email == data.email.lower(), User.tenant_id == tenant_id))
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

        user = User(
            tenant_id=tenant_id,
            email=data.email.lower(),
            password_hash=get_password_hash(data.password),
            first_name=data.first_name,
            last_name=data.last_name,
            role=data.role,
            status=UserStatus.ACTIVE,
            email_verified=True,  # Skip email verification for now
        )
        db.add(user)
        await db.flush()  # Get the ID without committing

        # Publish event for downstream services
        await event_producer.publish(
            Topics.USER_CREATED,
            "user.created",
            str(tenant_id),
            {"user_id": str(user.id), "email": user.email, "role": user.role},
        )

        return UserProfile.model_validate(user)

    async def refresh_tokens(
        self,
        refresh_token_plain: str,
        db: AsyncSession,
    ) -> TokenResponse:
        """Exchange a refresh token for new access + refresh tokens (rotation)."""
        token_hash = _hash_token(refresh_token_plain)

        result = await db.execute(
            select(RefreshToken).where(
                and_(
                    RefreshToken.token_hash == token_hash,
                    RefreshToken.revoked == False,
                    RefreshToken.expires_at > datetime.utcnow(),
                )
            )
        )
        stored_token = result.scalar_one_or_none()

        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        # Revoke old token (rotation prevents token reuse)
        stored_token.revoked = True

        # Get user
        user = await db.get(User, stored_token.user_id)
        if not user or user.status != UserStatus.ACTIVE:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not active")

        access_token = self._create_access_token(user)
        new_refresh_plain = await self._create_refresh_token(user, db)

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_plain,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def logout(self, refresh_token_plain: str, db: AsyncSession):
        """Revoke refresh token."""
        token_hash = _hash_token(refresh_token_plain)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        token = result.scalar_one_or_none()
        if token:
            token.revoked = True

    async def google_auth(
        self,
        id_token_str: str,
        tenant_id: uuid.UUID,
        db: AsyncSession,
    ) -> LoginResponse:
        """Authenticate via Google OAuth."""
        try:
            id_info = id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
            )
        except ValueError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

        google_user_id = id_info["sub"]
        email = id_info["email"].lower()
        first_name = id_info.get("given_name", "")
        last_name = id_info.get("family_name", "")
        avatar_url = id_info.get("picture")

        # Find existing OAuth account
        result = await db.execute(
            select(OAuthAccount).where(
                and_(
                    OAuthAccount.provider == OAuthProvider.GOOGLE,
                    OAuthAccount.provider_id == google_user_id,
                )
            )
        )
        oauth_account = result.scalar_one_or_none()

        if oauth_account:
            user = await db.get(User, oauth_account.user_id)
        else:
            # Find or create user by email
            result = await db.execute(
                select(User).where(and_(User.email == email, User.tenant_id == tenant_id))
            )
            user = result.scalar_one_or_none()

            if not user:
                user = User(
                    tenant_id=tenant_id,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    avatar_url=avatar_url,
                    role="student",
                    status=UserStatus.ACTIVE,
                    email_verified=True,
                )
                db.add(user)
                await db.flush()

            # Link OAuth account
            db.add(OAuthAccount(
                user_id=user.id,
                provider=OAuthProvider.GOOGLE,
                provider_id=google_user_id,
            ))

        user.last_login = datetime.utcnow()
        access_token = self._create_access_token(user)
        refresh_token_plain = await self._create_refresh_token(user, db)

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token_plain,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserProfile.model_validate(user),
        )

    def _create_access_token(self, user: User) -> str:
        return create_access_token({
            "sub": str(user.id),
            "tenant_id": str(user.tenant_id),
            "role": user.role,
            "email": user.email,
        })

    async def _create_refresh_token(
        self, user: User, db: AsyncSession, device_info: str = None
    ) -> str:
        plain_token = create_refresh_token()
        db.add(RefreshToken(
            user_id=user.id,
            token_hash=_hash_token(plain_token),
            expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            device_info={"info": device_info} if device_info else None,
        ))
        return plain_token

    async def _audit(
        self,
        db: AsyncSession,
        user_id,
        tenant_id,
        action: str,
        resource: str,
        ip_address: str = None,
        success: bool = True,
    ):
        db.add(AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            resource=resource,
            ip_address=ip_address,
            success=success,
        ))
