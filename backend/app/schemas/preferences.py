from __future__ import annotations

from typing import Annotated, Literal
from unicodedata import category

from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StringConstraints, field_validator


PreferenceId = Annotated[str, StringConstraints(min_length=16, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")]
RetryKey = Annotated[str, StringConstraints(min_length=16, max_length=128, pattern=r"^[A-Za-z0-9-]+$")]


class PreferenceCommand(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    schema_version: Literal[1] = 1
    idempotency_key: RetryKey
    base_version: Annotated[StrictInt, Field(ge=0)]
    text: Annotated[str, StringConstraints(min_length=1, max_length=200)]
    consent: StrictBool

    @field_validator("text")
    @classmethod
    def no_control_characters(cls, text: str) -> str:
        if any(category(char) == "Cc" for char in text):
            raise ValueError("preference must be a single line")
        return text


class DeletePreferenceCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal[1] = 1
    idempotency_key: RetryKey
    base_version: Annotated[StrictInt, Field(ge=1)]


class PreferenceMemorySyncCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal[1] = 1
