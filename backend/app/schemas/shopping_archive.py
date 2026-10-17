from __future__ import annotations

from typing import Annotated, Literal

from pydantic import Field, StrictBool, StrictInt, model_validator

from app.schemas.household import IdempotencyKey, OpaqueId, StrictModel


class ArchiveShoppingEntryCommand(StrictModel):
    """Versioned owner command to remove an entry from the active shopping list."""

    schema_version: Literal[1] = 1
    idempotency_key: IdempotencyKey
    entry_id: OpaqueId
    base_version: Annotated[StrictInt, Field(ge=1)]
    archived: StrictBool

    @model_validator(mode="after")
    def require_archive(self) -> ArchiveShoppingEntryCommand:
        if self.archived is not True:
            raise ValueError("only archival is supported")
        return self
