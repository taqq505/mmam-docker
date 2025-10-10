from fastapi import FastAPI
from app.routers import users, flows
from db_init import init_db

app = FastAPI(title="MMAM API")

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

# --------------------------------------------------------
# Router registration
# ルータ登録
# --------------------------------------------------------
app.include_router(users.router, prefix="/api")
app.include_router(flows.router, prefix="/api")

# --------------------------------------------------------
# Health check
# ヘルスチェック
# --------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MMAM"}
