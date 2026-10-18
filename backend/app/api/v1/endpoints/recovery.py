from __future__ import annotations

import re

from fastapi import APIRouter, Depends, Header, Query, Request, Response

from app.core.errors import DomainError
from app.core.identity import ActorContext, current_actor
from app.domain.offer_discovery import discover_offers
from app.domain.recovery_plans import create_recovery_plan, list_recovery_plans, read_recovery_plan, update_recovery_plan
from app.schemas.household import ApiResult
from app.schemas.recipient import (
    DiscoveryResult,
    OfferDiscoveryQuery,
    RecoveryPlanCreate,
    RecoveryPlanRecord,
    RecoveryPlanUpdate,
)


router = APIRouter(tags=["Recovery discovery and collections"])
_IDEMPOTENCY_KEY = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")


def _key(value: str) -> str:
    if not _IDEMPOTENCY_KEY.fullmatch(value):
        raise DomainError("VALIDATION_ERROR", "A valid Idempotency-Key header is required.", 400)
    return value


@router.get("/recovery/offers", response_model=ApiResult)
def nearby_offers(
    request: Request,
    response: Response,
    latitude: float = Query(ge=-90, le=90),
    longitude: float = Query(ge=-180, le=180),
    radius_km: float = Query(default=5, ge=1, le=20),
    query: str | None = Query(default=None, max_length=80),
    category: str | None = Query(default=None, min_length=2, max_length=80),
    pickup_state: str = Query(default="any", pattern="^(available_now|today|any)$"),
    cursor: str | None = Query(default=None, min_length=1, max_length=256),
    actor: ActorContext = Depends(current_actor),
) -> ApiResult:
    response.headers["Cache-Control"] = "no-store"
    command = OfferDiscoveryQuery(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        query=query,
        category=category,
        pickup_state=pickup_state,
        cursor=cursor,
    )
    result = discover_offers(actor, command)
    return ApiResult(request_id=request.state.request_id, result=DiscoveryResult.model_validate(result).model_dump(mode="json"))


@router.post("/recovery/plans", response_model=ApiResult, status_code=201)
def create_plan(
    request: Request,
    response: Response,
    command: RecoveryPlanCreate,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    response.headers["Cache-Control"] = "no-store"
    record = RecoveryPlanRecord.model_validate(create_recovery_plan(actor, command, _key(idempotency_key)))
    return ApiResult(request_id=request.state.request_id, result=record.model_dump(mode="json"))


@router.get("/recovery/plans", response_model=ApiResult)
def list_plans(
    request: Request,
    response: Response,
    limit: int = Query(default=25, ge=1, le=50),
    actor: ActorContext = Depends(current_actor),
) -> ApiResult:
    response.headers["Cache-Control"] = "no-store"
    return ApiResult(request_id=request.state.request_id, result=list_recovery_plans(actor, limit))


@router.get("/recovery/plans/{plan_id}", response_model=ApiResult)
def get_plan(
    plan_id: str,
    request: Request,
    response: Response,
    actor: ActorContext = Depends(current_actor),
) -> ApiResult:
    response.headers["Cache-Control"] = "no-store"
    record = RecoveryPlanRecord.model_validate(read_recovery_plan(actor, plan_id))
    return ApiResult(request_id=request.state.request_id, result=record.model_dump(mode="json"))


@router.patch("/recovery/plans/{plan_id}", response_model=ApiResult)
def patch_plan(
    plan_id: str,
    request: Request,
    response: Response,
    command: RecoveryPlanUpdate,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    response.headers["Cache-Control"] = "no-store"
    record = RecoveryPlanRecord.model_validate(update_recovery_plan(actor, plan_id, command, _key(idempotency_key)))
    return ApiResult(request_id=request.state.request_id, result=record.model_dump(mode="json"))
