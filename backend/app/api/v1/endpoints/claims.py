from __future__ import annotations

import re

from fastapi import APIRouter, Depends, Header, Query, Request, status

from app.core.errors import DomainError
from app.core.identity import ActorContext, current_actor
from app.domain.recipient_claims import (
    adjust_receipt,
    cancel_claim,
    collect_claim,
    get_claim,
    list_my_claims,
    receive_claim,
    reserve_plan_stop,
)
from app.domain.recipient_handover import donor_confirm_handover
from app.schemas.household import ApiResult
from app.schemas.recipient import ClaimCancel, ClaimCollect, ClaimReceive, DonorHandover, ReceiptAdjustment, ReservePlanStop


router = APIRouter(tags=["Recipient claims"])
_IDEMPOTENCY_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")


def _idempotency_key(value: str) -> str:
    if not _IDEMPOTENCY_PATTERN.fullmatch(value):
        raise DomainError("VALIDATION_ERROR", "A valid Idempotency-Key header is required.", 400)
    return value


@router.get("/claims/mine", response_model=ApiResult)
def my_claims(
    request: Request,
    actor: ActorContext = Depends(current_actor),
    limit: int = Query(default=100, ge=1, le=100),
) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result=list_my_claims(actor, limit))


@router.get("/claims/{claim_id}", response_model=ApiResult)
def claim_detail(claim_id: str, request: Request, actor: ActorContext = Depends(current_actor)) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result=get_claim(actor, claim_id))


@router.post("/recovery/plans/{plan_id}/stops/{stop_id}/reserve", status_code=status.HTTP_201_CREATED, response_model=ApiResult)
def reserve_stop(
    plan_id: str,
    stop_id: str,
    command: ReservePlanStop,
    request: Request,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    result = reserve_plan_stop(actor, plan_id, stop_id, command, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)


@router.post("/claims/{claim_id}/cancel", response_model=ApiResult)
def cancel_claim_endpoint(
    claim_id: str,
    command: ClaimCancel,
    request: Request,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    result = cancel_claim(actor, claim_id, command, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)


@router.post("/claims/{claim_id}/collect", response_model=ApiResult)
def collect_claim_endpoint(
    claim_id: str,
    command: ClaimCollect,
    request: Request,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    result = collect_claim(actor, claim_id, command, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)


@router.post("/claims/{claim_id}/receive", response_model=ApiResult)
def receive_claim_endpoint(
    claim_id: str,
    command: ClaimReceive,
    request: Request,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    result = receive_claim(actor, claim_id, command, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)


@router.post("/claims/{claim_id}/receipt-adjustments", response_model=ApiResult)
def adjust_receipt_endpoint(
    claim_id: str,
    command: ReceiptAdjustment,
    request: Request,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    result = adjust_receipt(actor, claim_id, command, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)


@router.post("/claims/{claim_id}/handover", response_model=ApiResult)
def donor_handover_endpoint(
    claim_id: str,
    command: DonorHandover,
    request: Request,
    actor: ActorContext = Depends(current_actor),
    idempotency_key: str = Header(alias="Idempotency-Key"),
) -> ApiResult:
    result = donor_confirm_handover(actor, claim_id, command, _idempotency_key(idempotency_key))
    return ApiResult(request_id=request.state.request_id, result=result)
