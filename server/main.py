"""
BillScan AI - FastAPI Application Entry Point
Serves API routes and (in production/Docker) the frontend build.
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import redis.asyncio as redis
import uvicorn
import os
from manager import ConnectionManager
from fastapi.responses import FileResponse

from database import init_db
from auth import router as auth_router
from routes import router as api_router
from security_routes import router as security_router
from audit import log_audit

# WebSocket Manager
manager = ConnectionManager()
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")


@asynccontextmanager
async def lifespan(app):
    init_db()
    print("\n⚡ BillScan AI Server v2.0")
    print("🌐 API: http://localhost:3001")
    print("📖 Docs: http://localhost:3001/docs\n")
    yield


app = FastAPI(
    title="BillScan AI",
    description="Billing Document OCR & Key-Value Extraction Platform",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS — allow dev and production origins
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://localhost:3001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Background task to listen for Redis events
async def redis_listener():
    """Subscribe to Redis channel and broadcast messages to WebSockets."""
    # Only run if we are in async/docker mode or Redis is available
    if os.environ.get("OCR_MODE") != "async" and "redis" not in REDIS_URL:
         return

    try:
        r = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        async with r.pubsub() as pubsub:
            await pubsub.subscribe("job_updates")
            print("🎧 Listening for Redis job updates...")
            async for message in pubsub.listen():
                if message["type"] == "message":
                    # Broadcast the raw JSON message
                    await manager.broadcast(message["data"])
    except Exception as e:
        print(f"⚠️ Redis Listener Error (Async mode might be limited): {e}")

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(redis_listener())

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# Include API routers
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(security_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


# ---- Serve built frontend in production (Docker) ----
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "client", "dist")

if os.path.isdir(FRONTEND_DIR):
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    # Catch-all: serve index.html for SPA client-side routing
    @app.get("/{path:path}")
    async def serve_frontend(path: str):
        file_path = os.path.join(FRONTEND_DIR, path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)
