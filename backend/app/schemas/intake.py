from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Annotated, Literal
from unicodedata import category

from pydantic import ConfigDict, Field, StringConstraints, model_validator

from app.schemas.household import Amount, DateType, FoodSource, IdempotencyKey, ItemName, StrictModel, UnitName


class IntakeSource(StrEnum):
    MANUAL = "MANUAL"
    TEXT = "TEXT"


class IntakeEntry(StrictModel):
    model_config = ConfigDict(strict=True, extra="forbid", str_strip_whitespace=True)

    name: ItemName
    amount: Amount | None
    unit: UnitName | None
    date_value: date | None
    date_type: DateType
    date_source: FoodSource | None
    storage: Annotated[str, StringConstraints(max_length=120)] | None

    @model_validator(mode="after")
    def validate_candidate(self) -> IntakeEntry:
        if (self.amount is None) != (self.unit is None):
            raise ValueError("amount and unit must be provided together")
        if self.date_type == DateType.UNKNOWN:
            if self.date_value is not None or self.date_source is not None:
                raise ValueError("unknown dates require null date_value and date_source")
        elif self.date_value is None or self.date_source is None:
            raise ValueError("known dates require date_value and date_source")
        if any(category(character) == "Cc" for character in self.name):
            raise ValueError("name must be a single-line item name")
        if self.storage is not None and any(category(character) == "Cc" for character in self.storage):
            raise ValueError("storage must be a single-line value")
        return self


class CreateIntakeCommand(StrictModel):
    model_config = ConfigDict(strict=True, extra="forbid", str_strip_whitespace=True)

    schema_version: Literal[1]
    idempotency_key: IdempotencyKey
    source: IntakeSource
    entries: Annotated[list[IntakeEntry], Field(min_length=1, max_length=10)]


class IntakeCandidate(StrictModel):
    candidate_id: str
    name: ItemName
    amount: Amount | None
    unit: UnitName | None
    date_value: date | None
    date_type: DateType
    date_source: FoodSource | None
    storage: Annotated[str, StringConstraints(max_length=120)] | None
    uncertainty: list[Literal["AMOUNT_UNKNOWN", "DATE_UNKNOWN", "STORAGE_UNKNOWN"]]


class IntakeRecord(StrictModel):
    intake_id: str
    status: Literal["CANDIDATE"]
    candidates: Annotated[list[IntakeCandidate], Field(min_length=1, max_length=10)]

