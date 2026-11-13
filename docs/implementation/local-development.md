# ARGUS Local Development Guide

This guide details how to configure, run, and test the ARGUS platform in a local Linux development environment.

---

## 1. Prerequisites

- **Python**: 3.12+ (with `venv` and `pip`)
- **PostgreSQL**: 16+ (installed locally or via container)
- **Redis**: 7+ (installed locally or via container)
- **Git**

---

## 2. Virtual Environment Setup

Initialize and activate the dedicated Python virtual environment:

```bash
# From repository root
python3 -m venv .venv
source .venv/bin/activate

# Install platform dependencies
pip install -e .
pip install -e ".[dev]"
```

---

## 3. Starting Local Database & Redis

If running directly on the Linux host without Docker:

```bash
# 1. Initialize local PostgreSQL data directory
initdb -D /tmp/argus_pg_data -U postgres --auth=trust

# 2. Start PostgreSQL daemon
postgres -D /tmp/argus_pg_data &

# 3. Create database and application roles
createdb -h /tmp -U postgres argus

psql -h /tmp -U postgres -d argus << 'EOF'
CREATE ROLE argus_migrator LOGIN PASSWORD 'secure_migrator_pass';
CREATE ROLE argus_app LOGIN PASSWORD 'secure_app_pass' NOBYPASSRLS;
GRANT ALL ON DATABASE argus TO argus_migrator;
GRANT CONNECT ON DATABASE argus TO argus_app;
EOF

# 4. Start Redis daemon
redis-server --unixsocket /tmp/redis.sock --unixsocketperm 777 --port 0 &
```

---

## 4. Running Database Migrations

Apply the versioned Alembic migrations:

```bash
# Run migrations up to latest revision
PYTHONPATH=. alembic upgrade head

# Verify migration state
psql -h /tmp -U postgres -d argus -c "SELECT * FROM alembic_version;"

# Rollback to baseline if needed
PYTHONPATH=. alembic downgrade base
```

---

## 5. Starting the FastAPI Application

Start the development API server using Uvicorn:

```bash
uvicorn argus.main:app --host 0.0.0.0 --port 8000 --reload
```

### Verifying Probes
- **Liveness**: `curl http://localhost:8000/health/live`
- **Readiness**: `curl http://localhost:8000/health/ready`
- **OpenAPI Documentation**: Open `http://localhost:8000/docs` in your browser.

---

## 6. Running the Test Suite

Execute the comprehensive automated test suite:

```bash
# Run all tests
PYTHONPATH=. pytest tests/ -v

# Run tenant isolation security tests specifically
PYTHONPATH=. pytest tests/test_tenant_isolation.py -v
```


---

## 7. Starting Temporal Local Dev Server & Worker

```bash
# 1. Start native Temporal development server
.venv/bin/temporal server start-dev \
    --ip 127.0.0.1 \
    --port 7233 \
    --db-filename /tmp/temporal_data.db \
    --headless &

# 2. Start ARGUS Mission Worker
PYTHONPATH=. python3 -m argus.orchestration.worker &
```

---

## 8. Starting LiteLLM Model Gateway

```bash
# 1. Initialize dedicated database
createdb -h /tmp -U postgres argus_litellm

# 2. Run LiteLLM Proxy service
LITELLM_LOCAL_MODEL_COST_MAP="True" \
LITELLM_MASTER_KEY="sk-litellm-master-key" \
OPENROUTER_API_KEY="${OPENROUTER_API_KEY}" \
.venv/bin/litellm --config config/litellm_config.yaml --port 4000 &
```

---

## 9. Running Complete Test Suite (39 Tests)

```bash
PYTHONPATH=. pytest tests/ -v
```
