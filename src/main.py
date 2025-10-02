# MMAM: Media Multicast Address Manager
from fastapi import FastAPI
from db_init import init_db  # 相対importに注意


app = FastAPI(title="MMAM API")

# DB初期化
init_db()

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MMAM"}
