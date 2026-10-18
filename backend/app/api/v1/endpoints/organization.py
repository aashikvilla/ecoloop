from __future__ import annotations

import re

from fastapi import APIRouter, Depends, Header, Request, Response

from app.core.errors import DomainError
from app.core.identity import authenticated_uid
from app.domain.recipient_profile import read_organization_profile, update_organization_profile
from app.schemas.household import ApiResult
from app.schemas.recipient import OrganizationProfileUpdate, OrganizationProfileView


router = APIRouter(tags=["Recipient organization profile"])
_IDEMPOTENCY_KEY = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")


def _key(value: str) -> str:
    if not _IDEMPOTENCY_KEY.fullmatch(value):
        raise DomainError("VALIDATION_ERROR", "A valid Idempotency-Key header is required.", 400)
    return value


@router.get("/organizations/{org_id}", response_model=ApiResult)
def get_organization_profile(
    org_id: str,
    request: Request,
    response: Response,
    uid: str = Depends(authenticated_uid),
) -> ApiResult:
    response.headers["Cache-Control"] = "no-store"
    profile = OrganizationProfileView.model_validate(read_organization_profile(org_id, uid))
    return ApiResult(request_id=request.state.request_id, result=profile.model_dump(mode="json"))


@router.patch("/organizations/{org_id}", response_model=ApiResult)
def patch_organization_profile(
    org_id: str,
    request: Request,
    response: Response,
    command: OrganizationProfileUpdate,
    uid: str = Depends(authenticated_uid),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    response.headers["Cache-Control"] = "no-store"
    profile = OrganizationProfileView.model_validate(
        update_organization_profile(org_id, uid, command, _key(idempotency_key))
    )
    return ApiResult(request_id=request.state.request_id, result=profile.model_dump(mode="json"))
