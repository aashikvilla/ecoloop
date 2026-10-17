from fastapi import APIRouter, Depends, Request

from app.core.identity import Principal, current_principal
from app.domain.meal_plans import MealProposalActionCommand, apply_meal_proposal_action
from app.schemas.household import ApiResult, OpaqueId


router = APIRouter()


@router.post("/assistant/proposals/{proposal_id}/meal-actions", response_model=ApiResult)
def meal_proposal_action(
    proposal_id: OpaqueId,
    request: Request,
    command: MealProposalActionCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    result = apply_meal_proposal_action(principal, proposal_id, command)
    return ApiResult(request_id=request.state.request_id, result=result)
