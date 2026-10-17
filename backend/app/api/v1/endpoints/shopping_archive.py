from typing import Any

from fastapi import APIRouter, Depends, Request

from app.core.errors import DomainError
from app.core.identity import Principal, current_principal
from app.domain.shopping_archive import archive_shopping_entry
from app.schemas.household import ApiResult
from app.schemas.shopping_archive import ArchiveShoppingEntryCommand


router = APIRouter()


@router.patch("/shopping/{entry_id}", response_model=ApiResult)
def archive_shopping(
    entry_id: str,
    request: Request,
    command: ArchiveShoppingEntryCommand,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    if command.entry_id != entry_id:
        raise DomainError("VALIDATION_ERROR", "The path and command shopping entry IDs must match.", 422)
    result: dict[str, Any] = archive_shopping_entry(principal, command)
    return ApiResult(request_id=request.state.request_id, result=result)
