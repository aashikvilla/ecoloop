from __future__ import annotations

from fastapi import APIRouter, Request, Response
from fastapi import Depends

from app.core.identity import ActorContext, current_actor
from app.domain.recovery_routes import build_recovery_route
from app.schemas.household import ApiResult
from app.schemas.recipient import CollectionRoute, RouteRequest


router = APIRouter(tags=["Recipient collection routes"])


@router.post("/recovery/routes", response_model=ApiResult)
def collection_route(
    request: Request,
    response: Response,
    command: RouteRequest,
    actor: ActorContext = Depends(current_actor),
) -> ApiResult:
    response.headers["Cache-Control"] = "no-store"
    route = build_recovery_route(actor, command)
    return ApiResult(request_id=request.state.request_id, result=CollectionRoute.model_validate(route).model_dump(mode="json"))
