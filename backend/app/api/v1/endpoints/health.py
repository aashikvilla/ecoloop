from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify backend service readiness."""
    return {
        "status": "healthy",
        "service": "ecoloop-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
