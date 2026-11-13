"""
Structured JSON Logging Module for ARGUS.
Provides trace correlation, request context, and secret redaction.
"""
import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any

# Sensitive pattern regexes for redaction
REDACTION_PATTERNS = [
    re.compile(r'(?i)(bearer\s+)([a-zA-Z0-9_\-\.]{15,})'),
    re.compile(r'(?i)(api[_-]?key[\'\"]?\s*[:=]\s*[\'\"]?)([a-zA-Z0-9_\-]{15,})'),
    re.compile(r'(?i)(password[\'\"]?\s*[:=]\s*[\'\"]?)([^\'\"\s]{4,})'),
    re.compile(r'(?i)(secret[\'\"]?\s*[:=]\s*[\'\"]?)([a-zA-Z0-9_\-]{15,})'),
    re.compile(r'(?i)(token[\'\"]?\s*[:=]\s*[\'\"]?)([a-zA-Z0-9_\-\.]{15,})'),
]


def redact_sensitive_text(text: str) -> str:
    """Redacts API keys, bearer tokens, passwords, and secrets from log strings."""
    if not isinstance(text, str):
        return text
    sanitized = text
    for pattern in REDACTION_PATTERNS:
        sanitized = pattern.sub(r'\1[REDACTED]', sanitized)
    return sanitized


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as single-line JSON objects with standard fields."""

    def format(self, record: logging.LogRecord) -> str:
        log_payload: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": redact_sensitive_text(record.getMessage()),
        }

        # Include request_id and trace_id if present in record attributes
        if hasattr(record, "request_id"):
            log_payload["request_id"] = record.request_id
        if hasattr(record, "trace_id"):
            log_payload["trace_id"] = record.trace_id
        if hasattr(record, "org_id"):
            log_payload["org_id"] = record.org_id
        if hasattr(record, "mission_id"):
            log_payload["mission_id"] = record.mission_id

        # Include exception details if present
        if record.exc_info:
            log_payload["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": redact_sensitive_text(str(record.exc_info[1])),
                "traceback": self.formatException(record.exc_info),
            }

        return json.dumps(log_payload)


def setup_logging(level: str = "INFO") -> None:
    """Configures the root logger with the StructuredJsonFormatter."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers to avoid duplicates
    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredJsonFormatter())
    root_logger.addHandler(handler)


logger = logging.getLogger("argus")
