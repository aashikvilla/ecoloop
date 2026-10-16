from datetime import datetime, timezone

from fastapi import APIRouter

from app.agents.household import get_agent_provider_status

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    """Report API liveness and non-probing assistant configuration metadata."""
    return {
        "status": "healthy",
        "service": "ecoloop-backend",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "assistant": get_agent_provider_status(),
    }
