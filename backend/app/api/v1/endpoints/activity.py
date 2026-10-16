from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from app.core.identity import Principal, current_principal
from app.domain.sharing_activity import create_share_log, list_activity, list_share_logs, transition_share_log
from app.schemas.household import ApiResult, CreateShareLogCommand, OpaqueId, TransitionShareLogCommand

router = APIRouter()


def _result(request_id: str, value: dict[str, Any]) -> ApiResult:
    return ApiResult(request_id=request_id, result=value)


@router.get("/share-logs", response_model=ApiResult)
def read_share_logs(
    request: Request,
    limit: int = Query(default=25, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=256),
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return _result(request.state.request_id, list_share_logs(principal, limit, cursor))


@router.post("/share-logs", response_model=ApiResult)
def create_share(
    request: Request,
    command: CreateShareLogCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return _result(request.state.request_id, create_share_log(principal, command))


@router.patch("/share-logs/{share_id}", response_model=ApiResult)
def update_share(
    share_id: OpaqueId,
    request: Request,
    command: TransitionShareLogCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return _result(request.state.request_id, transition_share_log(principal, share_id, command))


@router.get("/activity", response_model=ApiResult)
def read_activity(
    request: Request,
    limit: int = Query(default=25, ge=1, le=100),
    cursor: str | None = Query(default=None, max_length=256),
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return _result(request.state.request_id, list_activity(principal, limit, cursor))
