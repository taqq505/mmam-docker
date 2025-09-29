# MMAM: Media Multicast Address Manager
from fastapi import FastAPI

app = FastAPI(title="MMAM API")

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MMAM"}
