from typing import Any

from fastapi import APIRouter, Depends, Request

from app.core.identity import Principal, current_principal
from app.domain.intake import confirm_intake, create_intake, read_intake
from app.schemas.household import ApiResult, OpaqueId
from app.schemas.intake import ConfirmIntakeCommand, CreateIntakeCommand


router = APIRouter()


def _result(request_id: str, value: dict[str, Any]) -> ApiResult:
    return ApiResult(request_id=request_id, result=value)


@router.post("/intakes", response_model=ApiResult, status_code=201)
def create(
    request: Request,
    command: CreateIntakeCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return _result(request.state.request_id, create_intake(principal, command))


@router.get("/intakes/{intake_id}", response_model=ApiResult)
def read(
    request: Request,
    intake_id: OpaqueId,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return _result(request.state.request_id, read_intake(principal, intake_id))


@router.post("/intakes/{intake_id}/confirm", response_model=ApiResult)
def confirm(
    request: Request,
    intake_id: OpaqueId,
    command: ConfirmIntakeCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    return _result(request.state.request_id, confirm_intake(principal, intake_id, command))
