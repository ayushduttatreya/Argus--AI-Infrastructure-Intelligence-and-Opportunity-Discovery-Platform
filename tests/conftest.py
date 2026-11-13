"""
Pytest configuration and global test fixtures for ARGUS.
Disposes SQLAlchemy async engine connection pool between tests to prevent loop contention.
"""
import pytest
from argus.core.database import engine


@pytest.fixture(autouse=True)
async def dispose_engine_after_test():
    """Ensures connections are returned and pool is disposed cleanly between test event loops."""
    yield
    await engine.dispose()
