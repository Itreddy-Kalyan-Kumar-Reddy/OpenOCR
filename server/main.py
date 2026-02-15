"""
BillScan AI - FastAPI Application Entry Point
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from auth import router as auth_router
from routes import router as api_router


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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(api_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)

