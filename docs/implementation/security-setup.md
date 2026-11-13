# ARGUS Security & Access Control Guide

This document details the authentication architecture, token validation, role-based access control (RBAC), and egress security guardrails for ARGUS.

---

## 1. Authentication Architecture

ARGUS relies on OpenID Connect (OIDC) JWT tokens issued by Keycloak or standard identity providers (Google Workspace, Auth0).

```
Browser / Client
      │
      ▼ (Authorization Code Flow + PKCE)
Keycloak / OIDC Provider
      │
      ▼ (Issues JWT Bearer Token)
ARGUS FastAPI Gateway
      │
      ├──> Validate Token Signature & Expiry (JWKS / Public Key)
      ├──> Verify Issuer (iss) and Audience (aud)
      ├──> Extract oidc_subject (sub) and org_id
      └──> Enforce Role-Based Access Control (RBAC)
```

### Development Tokens
During local development (`ENV=development` and `ALLOW_DEV_AUTH=true`), signed HMAC-SHA256 tokens can be generated using `create_dev_token()`:

```python
from argus.core.security import create_dev_token

token = create_dev_token(
    user_id=user_uuid,
    org_id=org_uuid,
    role="researcher",
    email="researcher@company.com"
)
```

---

## 2. Role-Based Access Control (RBAC)

ARGUS defines 4 canonical roles:

| Role | Operational Permissions | Typical Identity |
|---|---|---|
| `admin` | Full control: user management, organization settings, connector provisioning. | Platform Administrator |
| `researcher` | Submit missions, trigger research runs, query intelligence reports, inspect evidence. | Core Analyst / User |
| `viewer` | Read-only access to completed intelligence reports and company profiles. | Executive / Guest |
| `service` | Machine identity scoped strictly to assigned agent tools and workflows. | Agent Service Worker |

### Enforcing Roles in Routes
Use the `require_role` FastAPI dependency:

```python
from fastapi import APIRouter, Depends
from argus.core.security import AuthenticatedUser, require_role

router = APIRouter()

@router.delete("/organizations/{org_id}")
async def delete_org(
    org_id: str,
    user: AuthenticatedUser = Depends(require_role("admin"))
):
    ...
```

---

## 3. SSRF & Outbound Egress Guardrails

Agents crawling third-party URLs must never be permitted to access private internal networks. The `SSRFValidator` in `argus.connectors.security` enforces:

1. **Pre-flight DNS Resolution**: Resolves hostnames to IP addresses before initiating TCP connections.
2. **Blocked IP Ranges**:
   - Loopback: `127.0.0.0/8`, `::1`
   - Link-Local & Cloud Metadata: `169.254.169.254`, `fe80::/10`
   - Private RFC 1918 Subnets: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
   - Carrier-Grade NAT: `100.64.0.0/10`
3. **Redirect Evaluation**: Validates destination IP on every HTTP redirect (301, 302, 307).

---

## 4. Secret Isolation Policy

- **No Secrets in Source Code**: No API keys, passwords, or tokens are committed to git.
- **Gitignore Protection**: `.gitignore` comprehensively ignores `.env*` (except `.env.example`), `*.pem`, `*.key`, and cache artifacts.
- **Master Key Isolation**: Upstream OpenRouter master keys are accessible only by the LiteLLM proxy; individual agent processes receive virtual keys with scoped spend limits.
- **Log Redaction**: Structured JSON logging automatically redacts tokens, bearer headers, and passwords matching sensitive regex patterns.
