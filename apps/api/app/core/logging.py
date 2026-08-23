import logging
import sys

import structlog


def configure_logging(level: str = "INFO") -> None:
    """Structured JSON log ra stdout (ADR-0008, docs/conventions/07-logging-observability.md)."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(level)),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
    )


logger = structlog.get_logger()
