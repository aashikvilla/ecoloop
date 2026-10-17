from fastapi import APIRouter
from app.api.v1.endpoints import accounts, activity, health, household, intakes, preferences

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(accounts.router)
api_router.include_router(preferences.router)
api_router.include_router(household.router)
api_router.include_router(activity.router)
api_router.include_router(intakes.router)
