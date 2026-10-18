from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from app.core.identity import ActorContext, current_actor
from app.domain.recipient_impact import read_impact
from app.schemas.household import ApiResult


router = APIRouter(tags=["Receipt impact"])


@router.get("/impact/me", response_model=ApiResult)
def my_receipt_impact(
    request: Request,
    actor: ActorContext = Depends(current_actor),
    limit: int = Query(default=100, ge=1, le=100),
    cursor: str | None = Query(default=None, min_length=1, max_length=128),
) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result=read_impact(actor, limit, cursor))
