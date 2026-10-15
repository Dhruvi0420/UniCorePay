"""
UniCorePay - Production-Grade Resilient Payment Engine
Main FastAPI Entrypoint.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler:
    - Startup: Initialize state, databases, start background workers.
    - Shutdown: Gracefully drain connections and terminate background workers.
    """
    print(f"🚀 [{settings.PROJECT_NAME}] Starting up...")
    yield
    print(f"🛑 [{settings.PROJECT_NAME}] Shutting down gracefully...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous self-healing payment resilience engine with SRE health monitoring.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """
    Standard Kubernetes liveness/readiness probe endpoint.
    """
    return {
        "status": "healthy",
        "version": settings.VERSION,
    }
