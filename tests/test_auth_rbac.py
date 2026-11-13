"""
ARGUS Phase 1.1 Authentication & OIDC Verification Tests.
Rigorously tests JWT validation, claim integrity, expiration, audience/issuer matching,
unsupported algorithms, and RBAC authorization boundaries.
"""
import time
import uuid
import pytest
from fastapi import APIRouter, Depends
from httpx import ASGITransport, AsyncClient
from jose import jwt
from argus.core.config import settings
from argus.core.security import (
    AuthenticatedUser,
    create_dev_token,
    get_current_user,
    require_role,
)
from argus.main import app

auth_test_router = APIRouter(prefix="/test-auth")


@auth_test_router.get("/me")
async def me_endpoint(user: AuthenticatedUser = Depends(get_current_user)):
    return {
        "user_id": str(user.user_id),
        "org_id": str(user.org_id),
        "role": user.role,
        "email": user.email,
    }


@auth_test_router.get("/admin-only")
async def admin_only_endpoint(user: AuthenticatedUser = Depends(require_role("admin"))):
    return {"status": "admin_granted"}


app.include_router(auth_test_router)


@pytest.mark.asyncio
async def test_auth_missing_token_fails_closed():
    """Verify that omitting the bearer token returns 401 UNAUTHORIZED."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/test-auth/me")
        assert resp.status_code == 401
        data = resp.json()
        assert data["error_code"] == "UNAUTHORIZED"
        assert "request_id" in data


@pytest.mark.asyncio
async def test_auth_invalid_signature_rejected():
    """Verify that a token signed with a different key is rejected."""
    payload = {
        "sub": str(uuid.uuid4()),
        "org_id": str(uuid.uuid4()),
        "role": "researcher",
        "iss": settings.OIDC_ISSUER,
        "aud": settings.OIDC_AUDIENCE,
        "exp": int(time.time()) + 3600,
    }
    # Sign with foreign key
    tampered_token = jwt.encode(payload, "wrong_secret_key_123456789012345", algorithm="HS256")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/test-auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
        assert resp.status_code == 401
        data = resp.json()
        assert data["error_code"] == "INVALID_TOKEN"


@pytest.mark.asyncio
async def test_auth_expired_token_rejected():
    """Verify that an expired token returns 401 EXPIRED_TOKEN."""
    now = int(time.time())
    payload = {
        "sub": str(uuid.uuid4()),
        "org_id": str(uuid.uuid4()),
        "role": "researcher",
        "iss": settings.OIDC_ISSUER,
        "aud": settings.OIDC_AUDIENCE,
        "iat": now - 3600,
        "exp": now - 60,  # Expired 60s ago
    }
    expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/test-auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert resp.status_code == 401
        data = resp.json()
        assert data["error_code"] == "EXPIRED_TOKEN"


@pytest.mark.asyncio
async def test_auth_incorrect_issuer_rejected():
    """Verify that a token from an untrusted issuer is rejected."""
    bad_iss_token = create_dev_token(
        user_id=uuid.uuid4(),
        org_id=uuid.uuid4(),
        issuer="http://rogue-idp.attacker.com/realms/fake"
    )
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/test-auth/me", headers={"Authorization": f"Bearer {bad_iss_token}"})
        assert resp.status_code == 401
        assert resp.json()["error_code"] == "INVALID_TOKEN"


@pytest.mark.asyncio
async def test_auth_incorrect_audience_rejected():
    """Verify that a token with incorrect audience claim is rejected."""
    bad_aud_token = create_dev_token(
        user_id=uuid.uuid4(),
        org_id=uuid.uuid4(),
        audience="some-other-app"
    )
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/test-auth/me", headers={"Authorization": f"Bearer {bad_aud_token}"})
        assert resp.status_code == 401
        assert resp.json()["error_code"] == "INVALID_TOKEN"


@pytest.mark.asyncio
async def test_auth_unsupported_none_algorithm_rejected():
    """Verify that unsigned tokens ('alg: none') are strictly rejected."""
    payload = {
        "sub": str(uuid.uuid4()),
        "org_id": str(uuid.uuid4()),
        "role": "researcher",
        "iss": settings.OIDC_ISSUER,
        "aud": settings.OIDC_AUDIENCE,
    }
    import base64
    import json

    # Unsigned token with none algorithm manually crafted
    header_b64 = base64.urlsafe_b64encode(json.dumps({"alg": "none", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    none_token = f"{header_b64}.{payload_b64}."

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/test-auth/me", headers={"Authorization": f"Bearer {none_token}"})
        assert resp.status_code == 401
        assert resp.json()["error_code"] == "UNSUPPORTED_ALGORITHM"


@pytest.mark.asyncio
async def test_auth_missing_tenant_claim_rejected():
    """Verify that a token missing the mandatory org_id claim fails closed."""
    now = int(time.time())
    payload = {
        "sub": str(uuid.uuid4()),
        # 'org_id' omitted!
        "role": "researcher",
        "iss": settings.OIDC_ISSUER,
        "aud": settings.OIDC_AUDIENCE,
        "exp": now + 3600,
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/test-auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401
        assert resp.json()["error_code"] == "INVALID_CLAIMS"


@pytest.mark.asyncio
async def test_auth_malformed_uuid_in_claims_rejected():
    """Verify that non-UUID org_id strings fail closed."""
    now = int(time.time())
    payload = {
        "sub": str(uuid.uuid4()),
        "org_id": "not-a-valid-uuid-string",
        "role": "researcher",
        "iss": settings.OIDC_ISSUER,
        "aud": settings.OIDC_AUDIENCE,
        "exp": now + 3600,
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/test-auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401
        assert resp.json()["error_code"] == "MALFORMED_CLAIMS"


@pytest.mark.asyncio
async def test_auth_valid_dev_token_success():
    """Verify successful verification and claim extraction from valid token."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()
    token = create_dev_token(user_id=user_id, org_id=org_id, role="researcher", email="test@argus.io")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/test-auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == str(user_id)
        assert data["org_id"] == str(org_id)
        assert data["role"] == "researcher"
        assert data["email"] == "test@argus.io"


@pytest.mark.asyncio
async def test_rbac_enforcement():
    """Verify RBAC role checks (Researcher forbidden from Admin route)."""
    user_id = uuid.uuid4()
    org_id = uuid.uuid4()

    researcher_token = create_dev_token(user_id=user_id, org_id=org_id, role="researcher")
    admin_token = create_dev_token(user_id=user_id, org_id=org_id, role="admin")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Researcher rejected with 403
        r_resp = await client.get("/test-auth/admin-only", headers={"Authorization": f"Bearer {researcher_token}"})
        assert r_resp.status_code == 403
        assert r_resp.json()["error_code"] == "INSUFFICIENT_PERMISSIONS"

        # Admin approved with 200
        a_resp = await client.get("/test-auth/admin-only", headers={"Authorization": f"Bearer {admin_token}"})
        assert a_resp.status_code == 200
        assert a_resp.json()["status"] == "admin_granted"


def test_dev_tokens_disallowed_in_production(monkeypatch):
    """Verify that attempting to create dev tokens in production raises RuntimeError."""
    monkeypatch.setattr(settings, "ENV", "production")
    with pytest.raises(RuntimeError) as exc_info:
        create_dev_token(user_id=uuid.uuid4(), org_id=uuid.uuid4())
    assert "cannot be generated in production" in str(exc_info.value)
