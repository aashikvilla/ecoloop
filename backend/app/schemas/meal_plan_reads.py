from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import Field, StrictInt, field_validator

from app.schemas.household import ItemName, NonNegativeAmount, OpaqueId, StrictModel, UnitName


class SavedMealPlanIngredient(StrictModel):
    item_id: OpaqueId | None = None
    name: ItemName
    amount: NonNegativeAmount | None = None
    unit: UnitName | None = None
    uncertain: bool
    quantity_basis: Literal["MEASURED", "ASSISTANT_ESTIMATE", "UNKNOWN"] | None = None
    scaled_from_amount: NonNegativeAmount | None = None


class SavedMealPlan(StrictModel):
    plan_id: OpaqueId
    title: ItemName
    servings: Annotated[StrictInt, Field(ge=1, le=100)]
    preparation_stage: Literal["NOT_STARTED", "PARTLY_PREPARED", "ALREADY_COOKED", "UNKNOWN"]
    version: Annotated[StrictInt, Field(ge=1)]
    created_at: datetime
    ingredients: Annotated[list[SavedMealPlanIngredient], Field(max_length=50)]

    @field_validator("created_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("created_at must include a timezone")
        return value.astimezone(timezone.utc)


class SavedMealPlanPage(StrictModel):
    schema_version: Literal[1] = 1
    plans: Annotated[list[SavedMealPlan], Field(max_length=100)]
    next_cursor: str | None = None


class MealPlanApiResult(StrictModel):
    schema_version: Literal[1] = 1
    request_id: str
    result: SavedMealPlanPage
