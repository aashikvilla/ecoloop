"""Production-grade FastAPI Main Application Template for Cloud Run."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB clients, warm caches
    print("EcoLoop API starting up on Cloud Run...")
    yield
    # Shutdown: Clean up connections
    print("EcoLoop API shutting down gracefully.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="EcoLoop API",
        description="Closed-loop Resource Decision Copilot",
        version="1.0.0",
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        openapi_url="/api/v1/openapi.json",
        lifespan=lifespan,
    )

    # CORS Configuration
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ecoloop.web.app",
        "https://ecoloop.firebaseapp.com",
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "service": "ecoloop-api",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "cloud_run_revision": os.getenv("K_REVISION", "local"),
        }

    return app


app = create_app()
