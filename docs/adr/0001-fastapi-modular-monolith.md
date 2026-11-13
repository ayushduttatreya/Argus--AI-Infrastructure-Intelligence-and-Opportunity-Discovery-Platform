# ADR 0001: FastAPI Modular Monolith Architecture

## Status
Accepted

## Context
ARGUS requires high-throughput asynchronous execution, validation of research payloads, robust typing, and tight integration with the modern Python data/AI ecosystem (Pydantic, pgvector, NumPy, NLP tokenizers, Langfuse, LiteLLM SDKs, Temporal Python SDK).
A microservices architecture at v0 would add unnecessary networking overhead, operational surface area, deployment friction, and distributed transaction complexity.

## Decision
ARGUS will be structured as a **modular monolith** in Python 3.12+ using **FastAPI** and **Pydantic v2**:
1. Single deployable codebase partitioned into strict domain modules (`api/`, `orchestration/`, `agents/`, `connectors/`, `rag/`, `storage/`, `eval/`).
2. Separate runtime processes (API server vs. Temporal activity workers) sharing common typed domain models and persistence abstractions.
3. Explicit dependency injection and async HTTP client pooling (`httpx.AsyncClient`).
4. Automated OpenAPI 3.1 generation and Pydantic validation across all system boundaries.

## Consequences
- **Positive**: Rapid local iteration, single repo dependency management, unified type system, zero serialization overhead between internal components, straightforward Docker Compose packaging.
- **Negative**: Language pinned to Python; CPU-heavy synchronous tasks (like heavy local tokenization or image parsing) must run in thread pools or dedicated worker processes to avoid blocking the asyncio event loop.
