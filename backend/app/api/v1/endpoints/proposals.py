import asyncio

from fastapi import APIRouter, Depends, Request

from app.agents.household import generate_household_turn
from app.core.identity import Principal, current_principal
from app.domain.proposals import apply_proposal_action, list_turns, persist_turn
from app.schemas.household import ApiResult, AssistantEnvelope, AssistantTurnRequest, OpaqueId
from app.schemas.proposals import ProposalActionCommand


router = APIRouter()


@router.post("/assistant/proposals/turns", response_model=AssistantEnvelope)
async def proposal_turn(
    request: Request,
    command: AssistantTurnRequest,
    principal: Principal = Depends(current_principal),
) -> AssistantEnvelope:
    response = await generate_household_turn(principal, command, request.state.request_id)
    return await asyncio.to_thread(persist_turn, principal, command, response)


@router.get("/assistant/proposals/history", response_model=ApiResult)
def proposal_history(request: Request, principal: Principal = Depends(current_principal)) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result={"turns": list_turns(principal)})


@router.post("/assistant/proposals/{proposal_id}/actions", response_model=ApiResult)
def proposal_action(
    proposal_id: OpaqueId,
    request: Request,
    command: ProposalActionCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return ApiResult(
        request_id=request.state.request_id,
        result=apply_proposal_action(principal, proposal_id, command),
    )
