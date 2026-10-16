from fastapi import APIRouter
from app.api.v1.endpoints import activity, health, household, intakes

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(household.router)
api_router.include_router(activity.router)
api_router.include_router(intakes.router)
