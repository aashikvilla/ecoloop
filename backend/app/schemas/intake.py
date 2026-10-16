from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Annotated, Literal
from unicodedata import category

from pydantic import BeforeValidator, ConfigDict, Field, StringConstraints, model_validator

from app.schemas.household import Amount, DateType, FoodSource, IdempotencyKey, ItemName, StrictModel, UnitName


class IntakeSource(StrEnum):
    MANUAL = "MANUAL"
    TEXT = "TEXT"


def _parse_iso_date(value: object) -> object:
    if isinstance(value, str):
        try:
            parsed = date.fromisoformat(value)
        except ValueError:
            return value
        if parsed.isoformat() == value:
            return parsed
    return value


def _parse_enum(enum_type: type[StrEnum]):
    def parse(value: object) -> object:
        if isinstance(value, str):
            try:
                return enum_type(value)
            except ValueError:
                return value
        return value

    return parse


IntakeDate = Annotated[date, BeforeValidator(_parse_iso_date)]
IntakeSourceValue = Annotated[IntakeSource, BeforeValidator(_parse_enum(IntakeSource))]
DateTypeValue = Annotated[DateType, BeforeValidator(_parse_enum(DateType))]
FoodSourceValue = Annotated[FoodSource, BeforeValidator(_parse_enum(FoodSource))]


class IntakeEntry(StrictModel):
    model_config = ConfigDict(strict=True, extra="forbid", str_strip_whitespace=True)

    name: ItemName
    amount: Amount | None
    unit: UnitName | None
    date_value: IntakeDate | None
    date_type: DateTypeValue
    date_source: FoodSourceValue | None
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
    source: IntakeSourceValue
    entries: Annotated[list[IntakeEntry], Field(min_length=1, max_length=10)]


class IntakeCandidate(StrictModel):
    candidate_id: str
    name: ItemName
    amount: Amount | None
    unit: UnitName | None
    date_value: IntakeDate | None
    date_type: DateTypeValue
    date_source: FoodSourceValue | None
    storage: Annotated[str, StringConstraints(max_length=120)] | None
    uncertainty: list[Literal["AMOUNT_UNKNOWN", "DATE_UNKNOWN", "STORAGE_UNKNOWN"]]


class IntakeRecord(StrictModel):
    intake_id: str
    status: Literal["CANDIDATE"]
    candidates: Annotated[list[IntakeCandidate], Field(min_length=1, max_length=10)]
