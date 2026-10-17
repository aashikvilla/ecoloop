from fastapi import APIRouter, Depends, Request

from app.core.identity import authenticated_uid
from app.domain.preferences import change_preference, list_preferences
from app.schemas.household import ApiResult
from app.schemas.preferences import DeletePreferenceCommand, PreferenceCommand, PreferenceId


router = APIRouter()


@router.get("/preferences", response_model=ApiResult)
def read_preferences(request: Request, uid: str = Depends(authenticated_uid)) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result={"preferences": list_preferences(uid), "memory_bank": "not_connected"})


@router.put("/preferences/{preference_id}", response_model=ApiResult)
def save_preference(request: Request, preference_id: PreferenceId, command: PreferenceCommand, uid: str = Depends(authenticated_uid)) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result=change_preference(uid, preference_id, command, delete=False))


@router.delete("/preferences/{preference_id}", response_model=ApiResult)
def remove_preference(request: Request, preference_id: PreferenceId, command: DeletePreferenceCommand, uid: str = Depends(authenticated_uid)) -> ApiResult:
    return ApiResult(request_id=request.state.request_id, result=change_preference(uid, preference_id, command, delete=True))
