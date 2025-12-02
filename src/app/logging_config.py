import logging
import os
import sys
from logging.config import dictConfig
from logging.handlers import TimedRotatingFileHandler  # noqa: F401  (needed for dictConfig resolution)
from pathlib import Path


def _bool_env(name: str, default: str = "true") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def setup_logging() -> None:
    """
    Configure application logging.
    Writes standard logs to LOG_DIR/api.log and audit logs to LOG_DIR/audit.log.
    """
    configured_dir = os.getenv("LOG_DIR", "/log")
    log_dir = Path(configured_dir)
    try:
        log_dir.mkdir(parents=True, exist_ok=True)
    except PermissionError:
        fallback = Path("./logs")
        fallback.mkdir(parents=True, exist_ok=True)
        sys.stderr.write(
            f"[logging] Permission denied for {configured_dir}, falling back to {fallback}\n"
        )
        log_dir = fallback

    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    audit_enabled = _bool_env("AUDIT_LOG_ENABLED", "true")

    app_log = log_dir / "api.log"
    audit_log = log_dir / "audit.log"

    dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
                "level": log_level
            },
            "file_app": {
                "class": "logging.handlers.TimedRotatingFileHandler",
                "formatter": "default",
                "filename": str(app_log),
                "when": "midnight",
                "backupCount": 7,
                "encoding": "utf-8",
                "level": log_level
            },
            "file_audit": {
                "class": "logging.handlers.TimedRotatingFileHandler",
                "formatter": "default",
                "filename": str(audit_log),
                "when": "midnight",
                "backupCount": 14,
                "encoding": "utf-8",
                "level": "INFO"
            }
        },
        "loggers": {
            "uvicorn": {"handlers": ["console", "file_app"], "level": log_level, "propagate": False},
            "uvicorn.error": {"handlers": ["console", "file_app"], "level": log_level, "propagate": False},
            "uvicorn.access": {"handlers": ["console", "file_app"], "level": log_level, "propagate": False},
            "mmam": {"handlers": ["console", "file_app"], "level": log_level, "propagate": False},
            "mmam.app": {"handlers": ["console", "file_app"], "level": log_level, "propagate": False},
            "mmam.flows": {"handlers": ["console", "file_app"], "level": log_level, "propagate": False},
            "mmam.audit": {
                "handlers": ["console", "file_audit"] if audit_enabled else ["console", "file_app"],
                "level": "INFO",
                "propagate": False
            }
        },
        "root": {
            "handlers": ["console", "file_app"],
            "level": log_level
        }
    })
