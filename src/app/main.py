import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.logging_config import setup_logging

setup_logging()

from app.routers import users, flows  # noqa: E402
from app.routers import settings as settings_router  # noqa: E402
from app.routers import nmos as nmos_router  # noqa: E402
from app.routers import address_map as address_map_router  # noqa: E402
from app.routers import logs as logs_router  # noqa: E402
from app import mqtt_client  # noqa: E402
from db_init import init_db  # noqa: E402

logger = logging.getLogger("mmam.app")

app = FastAPI(title="MMAM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------
# Startup event: Initialize DB with retry logic
# 起動時イベント: DB初期化（リトライ付き）
# --------------------------------------------------------
@app.on_event("startup")
def startup_event():
    try:
        init_db(max_retries=20, wait_sec=3)  # ← wait longer for DB startup
        logger.info("Startup complete: database initialized")
    except Exception as e:
        logger.exception("Startup failed during database initialization: %s", e)
        raise
    mqtt_client.ensure_client()
    logger.info("MQTT client ready")


@app.on_event("shutdown")
def shutdown_event():
    mqtt_client.shutdown()
    logger.info("Shutdown complete")

# --------------------------------------------------------
# Router registration
# ルータ登録
# --------------------------------------------------------
app.include_router(users.router, prefix="/api")
app.include_router(flows.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(nmos_router.router, prefix="/api")
app.include_router(address_map_router.router, prefix="/api")
app.include_router(logs_router.router, prefix="/api")

# --------------------------------------------------------
# Health check
# ヘルスチェック
# --------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MMAM"}
