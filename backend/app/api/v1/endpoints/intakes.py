import re
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.core.errors import DomainError
from app.core.identity import Principal, current_principal
from app.domain.intake import confirm_intake, create_intake, read_intake
from app.domain.photo_intake import create_photo_intake
from app.schemas.household import ApiResult, OpaqueId
from app.schemas.intake import ConfirmIntakeCommand, CreateIntakeCommand


router = APIRouter()
_IDEMPOTENCY_KEY = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")


def _result(request_id: str, value: dict[str, Any]) -> ApiResult:
    return ApiResult(request_id=request_id, result=value)


@router.post("/intakes", response_model=ApiResult, status_code=201)
def create(
    request: Request,
    command: CreateIntakeCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    if command.source.value == "PHOTO":
        raise DomainError("PHOTO_UPLOAD_REQUIRED", "Photo candidates must be extracted through the authenticated photo intake endpoint.", 422)
    return _result(request.state.request_id, create_intake(principal, command))


@router.post("/intakes/photo", response_model=ApiResult, status_code=201)
async def create_from_photo(
    request: Request,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    mime_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    idempotency_key = request.headers.get("idempotency-key", "")
    if not _IDEMPOTENCY_KEY.fullmatch(idempotency_key):
        raise DomainError("VALIDATION_ERROR", "A valid photo intake retry key is required.", 422)
    image_bytes = await request.body()
    result = await create_photo_intake(principal, image_bytes, mime_type, idempotency_key)
    return _result(request.state.request_id, result)


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
