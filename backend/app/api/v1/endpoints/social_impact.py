from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Request, Response, status

from app.core.errors import DomainError
from app.core.identity import ActorContext, authenticated_uid, current_actor
from app.domain.social_impact import (
    IDEMPOTENCY_PATTERN,
    create_claim,
    create_offer,
    create_organization,
    edit_offer,
    list_my_offers,
    list_my_organizations,
    list_public_offers,
    publish_offer,
    read_offer,
)
from app.schemas.household import ApiResult
from app.schemas.social_impact import ClaimCreate, OfferDraftCreate, OfferEdit, OfferPublish, OrganizationCreate


router = APIRouter(tags=["Social impact foundations"])


def _idempotency_key(value: str) -> str:
    if not IDEMPOTENCY_PATTERN.fullmatch(value):
        raise DomainError("VALIDATION_ERROR", "A valid Idempotency-Key header is required.", 400)
    return value


@router.post("/organizations", status_code=status.HTTP_201_CREATED, response_model=ApiResult)
def create_organization_endpoint(
    request: Request,
    command: OrganizationCreate,
    response: Response,
    uid: str = Depends(authenticated_uid),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    response.headers["Cache-Control"] = "no-store"
    result = create_organization(uid, command, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)


@router.get("/organizations/me", response_model=ApiResult)
def my_organizations(request: Request, uid: str = Depends(authenticated_uid)) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result=list_my_organizations(uid))


@router.post("/offers", status_code=status.HTTP_201_CREATED, response_model=ApiResult)
def create_offer_endpoint(
    request: Request,
    command: OfferDraftCreate,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    result = create_offer(actor, command.title, command.category, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)


@router.get("/offers/mine", response_model=ApiResult)
def my_offers(request: Request, actor: ActorContext = Depends(current_actor)) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result=list_my_offers(actor))


@router.get("/offers", response_model=ApiResult)
def search_offers(request: Request, actor: ActorContext = Depends(current_actor)) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result=list_public_offers(actor))


@router.patch("/offers/{offer_id}", response_model=ApiResult)
def edit_offer_endpoint(
    offer_id: str,
    request: Request,
    command: OfferEdit,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    result = edit_offer(actor, offer_id, command, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)


@router.post("/offers/{offer_id}/publish", response_model=ApiResult)
def publish_offer_endpoint(
    offer_id: str,
    request: Request,
    command: OfferPublish,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    result = publish_offer(actor, offer_id, command.expected_version, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)


@router.post("/offers/{offer_id}/claims", status_code=status.HTTP_201_CREATED, response_model=ApiResult)
def create_claim_endpoint(
    offer_id: str,
    request: Request,
    command: ClaimCreate,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    result = create_claim(actor, offer_id, command, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)


@router.get("/offers/{offer_id}", response_model=ApiResult)
def get_offer_endpoint(offer_id: str, request: Request, actor: ActorContext = Depends(current_actor)) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result=read_offer(actor, offer_id))
