from fastapi import APIRouter
from app.api.v1.endpoints import accounts, activity, health, household, intakes, meal_plans, preferences, private_media, proposals, shopping_archive

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(accounts.router)
api_router.include_router(preferences.router)
api_router.include_router(proposals.router)
api_router.include_router(meal_plans.router)
api_router.include_router(private_media.router)
api_router.include_router(shopping_archive.router)
api_router.include_router(household.router)
api_router.include_router(activity.router)
api_router.include_router(intakes.router)
