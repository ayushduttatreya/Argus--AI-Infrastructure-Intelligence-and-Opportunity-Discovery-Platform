"""
Security & Identity Module for ARGUS.
Implements OIDC JWT bearer verification, JWKS key management, RBAC,
and fail-closed tenant resolution.
"""
import time
import uuid
from typing import Annotated, Any, Literal
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from pydantic import BaseModel
from argus.core.config import settings
from argus.core.logging import logger

security_bearer = HTTPBearer(auto_error=False)

RoleType = Literal["admin", "researcher", "viewer", "service"]


class AuthenticatedUser(BaseModel):
    user_id: uuid.UUID
    org_id: uuid.UUID
    role: RoleType
    email: str
    oidc_subject: str
    oidc_issuer: str


# In-memory cache for JWKS keys
_jwks_cache: dict[str, Any] = {}
_jwks_last_fetched: float = 0.0
JWKS_CACHE_TTL = 300.0  # 5 minutes


async def get_jwks(jwks_url: str) -> dict[str, Any]:
    """Fetches and caches JWKS from the remote identity provider."""
    global _jwks_cache, _jwks_last_fetched
    now = time.time()
    if _jwks_cache and (now - _jwks_last_fetched) < JWKS_CACHE_TTL:
        return _jwks_cache

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(jwks_url)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail={"error_code": "JWKS_UNAVAILABLE", "message": "Failed to fetch identity provider JWKS."}
                )
            _jwks_cache = resp.json()
            _jwks_last_fetched = now
            return _jwks_cache
    except httpx.RequestError as exc:
        logger.error(f"Error fetching JWKS from {jwks_url}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error_code": "JWKS_UNAVAILABLE", "message": "Identity provider JWKS endpoint unreachable."}
        )


def create_dev_token(
    user_id: uuid.UUID,
    org_id: uuid.UUID,
    role: RoleType = "researcher",
    email: str = "dev.researcher@argus.internal",
    expires_in_seconds: int = 3600,
    issuer: str | None = None,
    audience: str | None = None,
    custom_claims: dict[str, Any] | None = None,
) -> str:
    """
    Generates a signed JWT token for local development and testing.
    Strictly disallowed in production environments.
    """
    if settings.ENV == "production":
        raise RuntimeError("CRITICAL: Development tokens cannot be generated in production environment.")

    now = int(time.time())
    payload = {
        "sub": str(user_id),
        "org_id": str(org_id),
        "role": role,
        "email": email,
        "iss": issuer or settings.OIDC_ISSUER,
        "aud": audience or settings.OIDC_AUDIENCE,
        "iat": now,
        "exp": now + expires_in_seconds,
    }
    if custom_claims:
        payload.update(custom_claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_bearer)]
) -> AuthenticatedUser:
    """
    Validates Bearer token and extracts verified AuthenticatedUser.
    Fails closed if token is missing, invalid, expired, or claims are malformed.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "UNAUTHORIZED", "message": "Missing bearer authentication token."}
        )

    token = credentials.credentials

    # Inspect token header without verification to determine algorithm and kid
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "INVALID_TOKEN", "message": f"Malformed token header: {exc}"}
        )

    alg = unverified_header.get("alg")
    if not alg or alg == "none":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "UNSUPPORTED_ALGORITHM", "message": "Unsigned or 'none' algorithm is forbidden."}
        )

    # 1. Production OIDC Path (RS256 via JWKS)
    if settings.ENV == "production" or (settings.OIDC_JWKS_URL and not settings.ALLOW_DEV_AUTH):
        if alg != "RS256":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "UNSUPPORTED_ALGORITHM", "message": "Only RS256 algorithm is permitted."}
            )
        if not settings.OIDC_JWKS_URL:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail={"error_code": "OIDC_NOT_CONFIGURED", "message": "Remote JWKS URL not configured."}
            )

        jwks = await get_jwks(settings.OIDC_JWKS_URL)
        kid = unverified_header.get("kid")
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_KEY_ID", "message": "Token signing key ID not found in JWKS."}
            )

        try:
            payload = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                audience=settings.OIDC_AUDIENCE,
                issuer=settings.OIDC_ISSUER
            )
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "EXPIRED_TOKEN", "message": "Authentication token has expired."}
            )
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_SIGNATURE", "message": f"Token signature validation failed: {exc}"}
            )

    # 2. Local Development & Test Path (HS256 with strict claims)
    else:
        if alg != "HS256":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "UNSUPPORTED_ALGORITHM", "message": f"Algorithm '{alg}' not supported for dev token."}
            )

        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
                audience=settings.OIDC_AUDIENCE,
                issuer=settings.OIDC_ISSUER
            )
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "EXPIRED_TOKEN", "message": "Authentication token has expired."}
            )
        except JWTError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_TOKEN", "message": f"Token validation failed: {exc}"}
            )

    # Validate mandatory claims
    user_id_str = payload.get("sub")
    org_id_str = payload.get("org_id")
    role = payload.get("role", "researcher")
    email = payload.get("email", "")
    iss = payload.get("iss", settings.OIDC_ISSUER)

    if not user_id_str or not org_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "INVALID_CLAIMS", "message": "Token missing required sub or org_id claims."}
        )

    try:
        user_uuid = uuid.UUID(str(user_id_str))
        org_uuid = uuid.UUID(str(org_id_str))
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "MALFORMED_CLAIMS", "message": f"Invalid UUID in token claims: {exc}"}
        )

    return AuthenticatedUser(
        user_id=user_uuid,
        org_id=org_uuid,
        role=role,
        email=email,
        oidc_subject=str(user_id_str),
        oidc_issuer=iss
    )


def require_role(*allowed_roles: RoleType):
    """RBAC dependency ensuring the authenticated user possesses an allowed role."""
    async def role_checker(
        current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]
    ) -> AuthenticatedUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error_code": "INSUFFICIENT_PERMISSIONS",
                    "message": f"User role '{current_user.role}' not authorized. Required: {list(allowed_roles)}"
                }
            )
        return current_user
    return role_checker
