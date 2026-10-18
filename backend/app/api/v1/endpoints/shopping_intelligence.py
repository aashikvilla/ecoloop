from typing import Any

from fastapi import APIRouter, Depends, Request

from app.core.identity import Principal, current_principal
from app.domain.photo_intake import identify_shopping_product
from app.schemas.household import ApiResult


router = APIRouter()


@router.post("/shopping/identify-photo", response_model=ApiResult)
async def identify_product_photo(
    request: Request,
    principal: Principal = Depends(current_principal),
) -> ApiResult:
    """Identify a transient shopping candidate; no intake or Kitchen write occurs."""
    mime_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    image_bytes = await request.body()
    result: dict[str, Any] = await identify_shopping_product(principal, image_bytes, mime_type)
    return ApiResult(request_id=request.state.request_id, result=result)
