from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import users, flows
from app.routers import settings as settings_router
from app.routers import nmos as nmos_router
from app.routers import address_map as address_map_router
from app import mqtt_client
from db_init import init_db

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
        print("[startup] Database initialization complete ✅")
    except Exception as e:
        print(f"[startup] Database initialization failed ❌: {e}")
        raise
    mqtt_client.ensure_client()


@app.on_event("shutdown")
def shutdown_event():
    mqtt_client.shutdown()

# --------------------------------------------------------
# Router registration
# ルータ登録
# --------------------------------------------------------
app.include_router(users.router, prefix="/api")
app.include_router(flows.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(nmos_router.router, prefix="/api")
app.include_router(address_map_router.router, prefix="/api")

# --------------------------------------------------------
# Health check
# ヘルスチェック
# --------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MMAM"}
