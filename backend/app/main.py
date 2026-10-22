"""
UniCorePay - Production-Grade Resilient Payment Engine
Main FastAPI Entrypoint.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db import init_db
from app.routes import menu, wallet, orders, system


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler:
    - Startup: Initialize SQLite database tables (clean, no demo data).
    - Shutdown: Graceful drain.
    """
    print(f">> [{settings.PROJECT_NAME}] Starting up...")
    init_db()
    print(">> SQLite database tables initialized successfully.")
    yield
    print(f">> [{settings.PROJECT_NAME}] Shutting down gracefully...")


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

# Mount API v1 routers
app.include_router(menu.router, prefix=settings.API_V1_STR)
app.include_router(wallet.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(system.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "endpoints": {
            "menu": f"{settings.API_V1_STR}/menu",
            "wallet": f"{settings.API_V1_STR}/wallet/STU-2026-001",
            "orders": f"{settings.API_V1_STR}/orders",
            "system_status": f"{settings.API_V1_STR}/system/status",
        }
    }


@app.get("/health")
async def health_check():
    """Kubernetes liveness/readiness probe endpoint."""
    return {
        "status": "healthy",
        "version": settings.VERSION,
    }
