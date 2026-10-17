from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictFloat, StrictInt, StrictStr, field_validator, model_validator


OrgType = Literal["business_donor", "recipient_org"]
ActorKind = Literal["household", "business", "recipient_org"]
OfferUnit = Literal["g", "ml", "portion", "package", "item"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class PickupBase(StrictModel):
    latitude: StrictFloat
    longitude: StrictFloat
    approximate_area: Annotated[StrictStr, Field(min_length=2, max_length=160)]

    @field_validator("latitude")
    @classmethod
    def valid_latitude(cls, value: float) -> float:
        if not -90 <= value <= 90:
            raise ValueError("latitude is out of range")
        return value

    @field_validator("longitude")
    @classmethod
    def valid_longitude(cls, value: float) -> float:
        if not -180 <= value <= 180:
            raise ValueError("longitude is out of range")
        return value


class OrganizationCreate(StrictModel):
    type: OrgType
    name: Annotated[StrictStr, Field(min_length=2, max_length=120)]
    category: Annotated[StrictStr, Field(min_length=2, max_length=80)] | None = None
    pickup_base: PickupBase | None = None

    @model_validator(mode="after")
    def recipient_needs_category(self) -> "OrganizationCreate":
        if self.type == "recipient_org" and not self.category:
            raise ValueError("recipient organizations require a category")
        return self


class OrganizationMembership(StrictModel):
    org_id: str
    uid: str
    role: Annotated[StrictStr, Field(min_length=1, max_length=40)]
    status: Literal["ACTIVE", "REVOKED"]
    permissions: list[Annotated[StrictStr, Field(min_length=1, max_length=80)]]
    version: Annotated[StrictInt, Field(ge=1)]
    created_at: datetime
    updated_at: datetime


class OrganizationRecord(StrictModel):
    org_id: str
    type: OrgType
    name: Annotated[StrictStr, Field(min_length=2, max_length=120)]
    category: str | None = None
    verification_status: Literal["PENDING", "APPROVED", "REVOKED"]
    pickup_base: PickupBase | None = None
    version: Annotated[StrictInt, Field(ge=1)]
    created_at: datetime
    updated_at: datetime


class OfferDraftCreate(StrictModel):
    title: Annotated[StrictStr, Field(min_length=2, max_length=120)]
    category: Annotated[StrictStr, Field(min_length=2, max_length=80)]


class OfferDonor(StrictModel):
    kind: Literal["household", "business"]
    owner_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    creator_uid: Annotated[StrictStr, Field(min_length=1, max_length=128)]


class OfferQuantities(StrictModel):
    quantity_total_minor: Annotated[StrictInt, Field(gt=0)]
    quantity_available_minor: Annotated[StrictInt, Field(ge=0)]
    quantity_reserved_minor: Annotated[StrictInt, Field(ge=0)]
    quantity_collected_minor: Annotated[StrictInt, Field(ge=0)]
    quantity_received_minor: Annotated[StrictInt, Field(ge=0)]
    unit: OfferUnit

    @model_validator(mode="after")
    def balance_ledger(self) -> "OfferQuantities":
        # Received quantity is a subset of collected quantity, not an extra balance.
        if self.quantity_received_minor > self.quantity_collected_minor:
            raise ValueError("received quantity cannot exceed collected quantity")
        if self.quantity_available_minor + self.quantity_reserved_minor + self.quantity_collected_minor > self.quantity_total_minor:
            raise ValueError("offer quantity ledger exceeds the total quantity")
        return self


class OfferRecordBase(StrictModel):
    offer_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    donor: OfferDonor
    title: Annotated[StrictStr, Field(min_length=2, max_length=120)]
    category: Annotated[StrictStr, Field(min_length=2, max_length=80)]
    tags: list[Annotated[StrictStr, Field(min_length=1, max_length=32)]] = Field(default_factory=list, max_length=20)
    expiry_declaration: Literal["UNKNOWN", "DONOR_DECLARED"]
    expiry_at: datetime | None = None
    storage_declaration: Literal["UNKNOWN", "AMBIENT", "CHILLED", "FROZEN", "OTHER"]
    allergen_declaration: Literal["UNKNOWN", "DONOR_DECLARED_NONE", "DONOR_DECLARED_PRESENT"]
    media_ids: list[Annotated[StrictStr, Field(min_length=1, max_length=128)]] = Field(default_factory=list, max_length=10)
    version: Annotated[StrictInt, Field(ge=1)]
    created_at: datetime
    updated_at: datetime


class DraftSurplusOfferRecord(OfferRecordBase):
    quantity_total_minor: Annotated[StrictInt, Field(gt=0)] | None
    quantity_available_minor: Annotated[StrictInt, Field(ge=0)] | None
    quantity_reserved_minor: Annotated[StrictInt, Field(ge=0, le=0)]
    quantity_collected_minor: Annotated[StrictInt, Field(ge=0, le=0)]
    quantity_received_minor: Annotated[StrictInt, Field(ge=0, le=0)]
    unit: OfferUnit | None
    pickup_window_start: datetime | None
    pickup_window_end: datetime | None
    approximate_area: Annotated[StrictStr, Field(min_length=2, max_length=160)] | None
    exact_address: Annotated[StrictStr, Field(min_length=5, max_length=500)] | None
    latitude: StrictFloat | None
    longitude: StrictFloat | None
    pickup_instructions: Annotated[StrictStr, Field(max_length=1000)] | None
    visibility: Literal["PRIVATE"]
    status: Literal["DRAFT"]

    @model_validator(mode="after")
    def validate_draft_quantities(self) -> "DraftSurplusOfferRecord":
        quantities = (self.quantity_total_minor, self.quantity_available_minor, self.unit)
        if any(value is None for value in quantities):
            if not all(value is None for value in quantities):
                raise ValueError("draft quantity and unit must be declared together")
        elif self.quantity_available_minor != self.quantity_total_minor:
            raise ValueError("draft available quantity must equal the declared total")
        return self


class SurplusOfferRecord(OfferRecordBase, OfferQuantities):
    pickup_window_start: datetime
    pickup_window_end: datetime
    approximate_area: Annotated[StrictStr, Field(min_length=2, max_length=160)]
    exact_address: Annotated[StrictStr, Field(min_length=5, max_length=500)]
    latitude: StrictFloat
    longitude: StrictFloat
    pickup_instructions: Annotated[StrictStr, Field(max_length=1000)] = ""
    visibility: Literal["PUBLIC", "PRIVATE"]
    status: Literal["OPEN", "PARTIALLY_RESERVED", "FULLY_RESERVED", "CLOSED", "EXPIRED", "CANCELLED"]


class OfferMediaRecord(StrictModel):
    media_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    offer_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    object_key: Annotated[StrictStr, Field(min_length=1, max_length=512, pattern=r"^private-offer-media/(household|business)/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+/[A-Za-z0-9_-]+$")]
    mime_type: Literal["image/jpeg", "image/png", "image/webp"]
    upload_state: Literal["PENDING", "UPLOADED", "DELETED", "FAILED"]
    analysis_state: Literal["NOT_REQUESTED", "PENDING", "OBSERVED", "FAILED"]
    observations: dict[str, object] | None = None
    created_at: datetime
    updated_at: datetime


class OfferClaimRecord(StrictModel):
    claim_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    offer_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    recipient_org_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    org_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    reserved_by: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    offer_version: Annotated[StrictInt, Field(ge=1)]
    pickup_window_start: datetime
    pickup_window_end: datetime
    quantity_minor: Annotated[StrictInt, Field(gt=0)]
    unit: OfferUnit
    status: Literal["RESERVED", "PICKUP_IN_PROGRESS", "COLLECTED", "RECEIVED", "CANCELLED", "EXPIRED", "DISPUTED"]
    collected_quantity_minor: Annotated[StrictInt, Field(ge=0)] = 0
    received_quantity_minor: Annotated[StrictInt, Field(ge=0)] = 0
    version: Annotated[StrictInt, Field(ge=1)]
    idempotency_key: Annotated[StrictStr, Field(min_length=8, max_length=128)]
    reserved_at: datetime

    @model_validator(mode="after")
    def received_does_not_exceed_collected(self) -> "OfferClaimRecord":
        if self.org_id != self.recipient_org_id:
            raise ValueError("claim organization references must agree")
        if not self.received_quantity_minor <= self.collected_quantity_minor <= self.quantity_minor:
            raise ValueError("received and collected quantities cannot exceed the reserved amount")
        return self


class PickupEventRecord(StrictModel):
    event_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    claim_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    offer_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    event_type: Literal["RESERVED", "DONOR_HANDOVER", "COLLECTOR_COLLECTED", "ORG_RECEIVED", "CANCELLED", "REVERSED"]
    actor_kind: ActorKind
    actor_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    actor_uid: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    quantity_minor: Annotated[StrictInt, Field(ge=0)]
    unit: OfferUnit
    occurred_at: datetime
    idempotency_key: Annotated[StrictStr, Field(min_length=8, max_length=128)]


class OfferEdit(StrictModel):
    expected_version: Annotated[StrictInt, Field(ge=1)]
    title: Annotated[StrictStr, Field(min_length=2, max_length=120)]
    category: Annotated[StrictStr, Field(min_length=2, max_length=80)]
    tags: list[Annotated[StrictStr, Field(min_length=1, max_length=32)]] = Field(default_factory=list, max_length=20)
    quantity_total_minor: Annotated[StrictInt, Field(gt=0, le=1_000_000_000)]
    unit: OfferUnit
    expiry_declaration: Literal["UNKNOWN", "DONOR_DECLARED"]
    expiry_at: datetime | None = None
    storage_declaration: Literal["UNKNOWN", "AMBIENT", "CHILLED", "FROZEN", "OTHER"]
    allergen_declaration: Literal["UNKNOWN", "DONOR_DECLARED_NONE", "DONOR_DECLARED_PRESENT"]
    pickup_window_start: datetime
    pickup_window_end: datetime
    approximate_area: Annotated[StrictStr, Field(min_length=2, max_length=160)]
    exact_address: Annotated[StrictStr, Field(min_length=5, max_length=500)]
    latitude: StrictFloat
    longitude: StrictFloat
    pickup_instructions: Annotated[StrictStr, Field(max_length=1000)] = ""

    @model_validator(mode="after")
    def validate_declarations(self) -> "OfferEdit":
        if (self.expiry_declaration == "DONOR_DECLARED") != (self.expiry_at is not None):
            raise ValueError("expiry_at must be present only for a donor-declared expiry")
        if self.expiry_at is not None and (self.expiry_at.tzinfo is None or self.expiry_at.utcoffset() is None):
            raise ValueError("expiry_at must include a timezone")
        if self.pickup_window_start.tzinfo is None or self.pickup_window_start.utcoffset() is None:
            raise ValueError("pickup window timestamps must include a timezone")
        if self.pickup_window_end.tzinfo is None or self.pickup_window_end.utcoffset() is None:
            raise ValueError("pickup window timestamps must include a timezone")
        if self.pickup_window_end <= self.pickup_window_start:
            raise ValueError("pickup window end must follow its start")
        if not -90 <= self.latitude <= 90 or not -180 <= self.longitude <= 180:
            raise ValueError("pickup coordinates are out of range")
        return self


class OfferPublish(StrictModel):
    expected_version: Annotated[StrictInt, Field(ge=1)]
    confirmed: Literal[True]


class ClaimCreate(StrictModel):
    quantity_minor: Annotated[StrictInt, Field(gt=0, le=1_000_000_000)]
    unit: OfferUnit
    expected_offer_version: Annotated[StrictInt, Field(ge=1)]


class RecoveryNeedDraft(StrictModel):
    people_requested: Annotated[StrictInt, Field(gt=0, le=100_000)] | None = None
    quantity_minor: Annotated[StrictInt, Field(gt=0)] | None = None
    unit: OfferUnit | None = None
    declared_portions_per_person: Annotated[StrictInt, Field(gt=0, le=100)] | None = None
    constraints: list[Annotated[StrictStr, Field(min_length=1, max_length=100)]] = Field(default_factory=list, max_length=30)
    missing_fields: list[Annotated[StrictStr, Field(min_length=1, max_length=80)]] = Field(default_factory=list, max_length=30)

    @model_validator(mode="after")
    def require_explicit_conversion(self) -> "RecoveryNeedDraft":
        if self.people_requested is not None and self.quantity_minor is not None and self.unit == "portion" and self.declared_portions_per_person is None:
            raise ValueError("people-to-portion conversion must be explicitly declared")
        return self


class RecoveryNeedRecord(StrictModel):
    need_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    org_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    people_requested: Annotated[StrictInt, Field(gt=0)] | None = None
    quantity_minor: Annotated[StrictInt, Field(gt=0)] | None = None
    unit: OfferUnit | None = None
    declared_portions_per_person: Annotated[StrictInt, Field(gt=0)] | None = None
    constraints: list[Annotated[StrictStr, Field(min_length=1, max_length=100)]] = Field(default_factory=list, max_length=30)
    origin: PickupBase | None = None
    deadline: datetime | None = None
    unknowns: list[Annotated[StrictStr, Field(min_length=1, max_length=100)]] = Field(default_factory=list, max_length=30)
    version: Annotated[StrictInt, Field(ge=1)]
    created_at: datetime

    @model_validator(mode="after")
    def require_declared_conversion(self) -> "RecoveryNeedRecord":
        if self.people_requested is not None and self.unit == "portion" and self.quantity_minor is not None and self.declared_portions_per_person is None:
            raise ValueError("people-to-portion conversion must be explicitly declared")
        return self


class RecoveryPlanProposal(StrictModel):
    org_id: str
    offer_ids: list[Annotated[StrictStr, Field(min_length=1, max_length=128)]] = Field(max_length=50)
    need: RecoveryNeedDraft
    status: Literal["PROPOSED", "CANCELLED"] = "PROPOSED"
    versions: dict[str, Annotated[StrictInt, Field(ge=1)]] = Field(default_factory=dict)


class ImpactEvent(StrictModel):
    claim_id: str
    offer_id: str
    donor_kind: Literal["household", "business"]
    donor_owner_id: str
    recipient_org_id: str
    confirmed_quantity_minor: Annotated[StrictInt, Field(gt=0)]
    unit: OfferUnit
    receipt_event_id: str
    reversal_of: str | None = None
    recorded_at: datetime


class OfferPublicView(StrictModel):
    offer_id: str
    title: str
    category: str
    donor_kind: Literal["household", "business"]
    approximate_area: str
    quantity_available_minor: Annotated[StrictInt, Field(ge=0)]
    unit: OfferUnit
    status: Literal["OPEN", "PARTIALLY_RESERVED", "FULLY_RESERVED", "CLOSED", "EXPIRED", "CANCELLED"]
    pickup_window_start: datetime
    pickup_window_end: datetime
    exact_address: str | None = None
    pickup_instructions: str | None = None
    media_ids: list[str] = Field(default_factory=list)
