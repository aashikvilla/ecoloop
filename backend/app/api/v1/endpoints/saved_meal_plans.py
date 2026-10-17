from fastapi import APIRouter, Depends, Query, Request

from app.core.identity import Principal, current_principal
from app.domain.saved_meal_plans import list_saved_meal_plans
from app.schemas.meal_plan_reads import MealPlanApiResult, SavedMealPlanPage


router = APIRouter()


@router.get("/meal-plans", response_model=MealPlanApiResult)
def read_saved_meal_plans(
    request: Request,
    limit: int = Query(default=25, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=256),
    principal: Principal = Depends(current_principal),
) -> MealPlanApiResult:
    page = SavedMealPlanPage.model_validate(list_saved_meal_plans(principal, limit, cursor))
    return MealPlanApiResult(request_id=request.state.request_id, result=page)
