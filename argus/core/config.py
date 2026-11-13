"""
ARGUS Platform Configuration Module.
Strictly validated using Pydantic Settings v2.
"""
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # 1. Environment & Service Settings
    ENV: Literal["development", "staging", "production", "test"] = "development"
    DEBUG: bool = False
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    APP_NAME: str = "ARGUS Intelligence Platform"
    APP_VERSION: str = "1.0.0"
    SECRET_KEY: str = Field(
        default="argus_dev_insecure_secret_key_at_least_32_characters_long",
        description="Internal HMAC secret key for signed dev tokens and sessions"
    )

    # 2. Database (PostgreSQL 16+)
    # Budgeted connection pool:
    # API: 10 base + 5 overflow = 15 max connections
    # Worker: 15 base + 5 overflow = 20 max connections
    # Admin/Other: 10 connections. Total ≤ 45 (within PostgreSQL max 50-100)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres@/argus?host=/tmp",
        description="Async SQLAlchemy database URL. Defaults to local socket in dev."
    )
    MIGRATION_DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres@/argus?host=/tmp",
        description="Database URL for running schema migrations (can use admin role)."
    )
    DISPATCHER_DATABASE_URL: str = Field(
        default="postgresql+asyncpg://argus_dispatcher:secure_dispatcher_pass@/argus?host=/tmp",
        description="Database URL for outbox dispatcher connecting with minimal cross-tenant leasing role."
    )
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_TIMEOUT: int = 10
    DB_POOL_RECYCLE: int = 1800
    DB_ECHO: bool = False

    # 3. Redis (Cache & Session)
    REDIS_URL: str = Field(
        default="unix:///tmp/redis.sock",
        description="Redis connection URL (TCP or Unix socket)"
    )
    REDIS_TIMEOUT_SECONDS: float = 2.0

    # 4. Storage (MinIO / S3)
    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "argus-raw-documents"
    STORAGE_SECURE: bool = False

    # 5. Temporal Orchestration
    TEMPORAL_HOST: str = "localhost:7233"
    TEMPORAL_NAMESPACE: str = "default"
    TEMPORAL_TASK_QUEUE: str = "argus-research-tasks"

    # 6. LiteLLM Proxy Gateway
    LITELLM_PROXY_URL: str = "http://localhost:4000"
    LITELLM_MASTER_KEY: str = "sk-litellm-master-key"

    # 7. Authentication (OIDC & RBAC)
    OIDC_ISSUER: str = "http://localhost:8080/realms/argus"
    OIDC_CLIENT_ID: str = "argus-api"
    OIDC_AUDIENCE: str = "argus-api"
    OIDC_JWKS_URL: str | None = None
    ALLOW_DEV_AUTH: bool = True  # True only for local dev when ENV=development


settings = Settings()
