from typing import Annotated, Literal

from pydantic import Field, StrictInt

from app.schemas.household import IdempotencyKey, StrictModel


class ProposalActionCommand(StrictModel):
    schema_version: Literal[1] = 1
    idempotency_key: IdempotencyKey
    base_version: Annotated[StrictInt, Field(ge=1)]
    action: Literal["ADD", "DISMISS"]
