from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, Depends, Request

from app.core.errors import DomainError
from app.core.identity import Principal, current_principal
from app.domain.private_media import create_private_media, delete_private_media, read_private_media
from app.schemas.household import ApiResult


router = APIRouter()
_IDEMPOTENCY_KEY = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")
_MEDIA_ID = re.compile(r"^[a-f0-9]{32}$")


def _result(request_id: str, value: dict[str, Any]) -> ApiResult:
    return ApiResult(request_id=request_id, result=value)


@router.post("/private-media", response_model=ApiResult, status_code=201)
async def upload_private_media(
    request: Request,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    mime_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    idempotency_key = request.headers.get("idempotency-key", "")
    if not _IDEMPOTENCY_KEY.fullmatch(idempotency_key):
        raise DomainError("VALIDATION_ERROR", "A valid private media retry key is required.", 422)
    image_bytes = await request.body()
    result = create_private_media(principal, image_bytes, mime_type, idempotency_key)
    return _result(request.state.request_id, result)


@router.get("/private-media/{media_id}", response_model=ApiResult)
def read(
    request: Request,
    media_id: str,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    if not _MEDIA_ID.fullmatch(media_id):
        raise DomainError("NOT_FOUND", "The requested private media record was not found.", 404)
    return _result(request.state.request_id, read_private_media(principal, media_id))


@router.delete("/private-media/{media_id}", response_model=ApiResult)
def delete(
    request: Request,
    media_id: str,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    if not _MEDIA_ID.fullmatch(media_id):
        raise DomainError("NOT_FOUND", "The requested private media record was not found.", 404)
    return _result(request.state.request_id, delete_private_media(principal, media_id))
