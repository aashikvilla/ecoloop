from typing import Any

from fastapi import APIRouter, Depends, Request

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import Principal, current_principal
from app.domain.repository import confirm_facts, list_shopping_entries, record_outcome, save_shopping_entry
from app.schemas.household import (
    ApiResult,
    AssistantTurnRequest,
    ConfirmFactsCommand,
    ProviderUnavailable,
    RecordOutcomeCommand,
    ShoppingCommand,
)


router = APIRouter()


def _result(request_id: str, value: dict[str, Any]) -> ApiResult:
    return ApiResult(request_id=request_id, result=value)


@router.get("/kitchen", response_model=ApiResult)
def get_kitchen(
    request: Request,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    # Request ID is injected by middleware at the API edge, not accepted from the client.
    try:
        query = (
            get_firestore()
            .collection("households")
            .document(principal.household_id)
            .collection("food_observations")
            .order_by("observed_at", direction="DESCENDING")
            .limit(200)
        )
        items = [snapshot.to_dict() | {"item_id": snapshot.id} for snapshot in query.stream()]
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The kitchen is unavailable.", 503, True) from exc
    return _result(request.state.request_id, {"observations": items})


@router.post("/facts/confirm", response_model=ApiResult)
def confirm(
    request: Request,
    command: ConfirmFactsCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return _result(request.state.request_id, confirm_facts(principal, command))


@router.post("/outcomes", response_model=ApiResult)
def outcome(
    request: Request,
    command: RecordOutcomeCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return _result(request.state.request_id, record_outcome(principal, command))


@router.get("/shopping", response_model=ApiResult)
def read_shopping(request: Request, principal: Principal = Depends(current_principal)) -> ApiResult:
    return _result(request.state.request_id, {"entries": list_shopping_entries(principal)})


@router.post("/shopping", response_model=ApiResult)
def shopping(
    request: Request,
    command: ShoppingCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return _result(request.state.request_id, save_shopping_entry(principal, command))


@router.post("/assistant/turns", response_model=ProviderUnavailable, status_code=503)
def assistant_unavailable(
    _: AssistantTurnRequest,
    __: Principal = Depends(current_principal),
) -> ProviderUnavailable:
    # Never substitute local scripts or fabricated memory for managed Gemini/ADK services.
    return ProviderUnavailable()
