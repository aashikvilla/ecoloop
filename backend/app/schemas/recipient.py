from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import Field, StrictFloat, StrictInt, StrictStr, field_validator, model_validator

from app.schemas.social_impact import OfferUnit, PickupBase, StrictModel


ProfileStatus = Literal["INCOMPLETE", "COMPLETE"]
CollectionStatus = Literal["ACTIVE", "PARTIAL", "COMPLETED", "CANCELLED"]
StopStatus = Literal["SELECTED", "RESERVED", "COLLECTED", "RECEIVED", "UNAVAILABLE", "CANCELLED", "EXPIRED"]


class OrganizationProfileUpdate(StrictModel):
    expected_version: Annotated[StrictInt, Field(ge=1)]
    name: Annotated[StrictStr, Field(min_length=2, max_length=120)]
    category: Annotated[StrictStr, Field(min_length=2, max_length=80)]
    pickup_base: PickupBase
    service_radius_km: Annotated[StrictFloat, Field(ge=1, le=20)] = 5.0


class OrganizationProfileCreate(StrictModel):
    name: Annotated[StrictStr, Field(min_length=2, max_length=120)]
    category: Annotated[StrictStr, Field(min_length=2, max_length=80)]
    pickup_base: PickupBase
    service_radius_km: Annotated[StrictFloat, Field(ge=1, le=20)] = 5.0


class OrganizationProfileView(StrictModel):
    org_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    type: Literal["recipient_org"]
    name: Annotated[StrictStr, Field(min_length=2, max_length=120)]
    category: Annotated[StrictStr, Field(min_length=2, max_length=80)]
    verification_status: Literal["PENDING", "APPROVED"]
    profile_status: ProfileStatus
    pickup_base: PickupBase | None
    service_radius_km: Annotated[StrictFloat, Field(ge=1, le=20)]
    version: Annotated[StrictInt, Field(ge=1)]
    updated_at: datetime


class OfferDiscoveryQuery(StrictModel):
    latitude: Annotated[StrictFloat, Field(ge=-90, le=90)]
    longitude: Annotated[StrictFloat, Field(ge=-180, le=180)]
    radius_km: Annotated[StrictFloat, Field(ge=1, le=20)] = 5.0
    query: Annotated[StrictStr, Field(max_length=80)] | None = None
    category: Annotated[StrictStr, Field(min_length=2, max_length=80)] | None = None
    pickup_state: Literal["available_now", "today", "any"] = "any"
    cursor: Annotated[StrictStr, Field(min_length=1, max_length=256)] | None = None


class DiscoveredOffer(StrictModel):
    offer_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    title: Annotated[StrictStr, Field(min_length=2, max_length=120)]
    category: Annotated[StrictStr, Field(min_length=2, max_length=80)]
    tags: list[Annotated[StrictStr, Field(min_length=1, max_length=32)]] = Field(default_factory=list, max_length=20)
    donor_kind: Literal["household", "business"]
    quantity_available_minor: Annotated[StrictInt, Field(gt=0)]
    unit: OfferUnit
    expiry_declaration: Literal["UNKNOWN", "DONOR_DECLARED"]
    expiry_at: datetime | None = None
    condition_declaration: Literal["UNKNOWN", "DONOR_CONFIRMED_SUITABLE"]
    storage_declaration: Literal["UNKNOWN", "AMBIENT", "CHILLED", "FROZEN", "OTHER"]
    allergen_declaration: Literal["UNKNOWN", "DONOR_DECLARED_NONE", "DONOR_DECLARED_PRESENT"]
    pickup_window_start: datetime
    pickup_window_end: datetime
    approximate_area: Annotated[StrictStr, Field(min_length=2, max_length=160)]
    approximate_latitude: StrictFloat
    approximate_longitude: StrictFloat
    approximate_distance_km: Annotated[StrictFloat, Field(ge=0)]
    status: Literal["OPEN", "PARTIALLY_RESERVED"]
    version: Annotated[StrictInt, Field(ge=1)]
    demo_scenario: bool = False


class DiscoveryResult(StrictModel):
    offers: list[DiscoveredOffer] = Field(max_length=100)
    next_cursor: Annotated[StrictStr, Field(min_length=1, max_length=256)] | None = None
    capped: bool = False


class RecoveryNeedInput(StrictModel):
    item_query: Annotated[StrictStr, Field(min_length=2, max_length=80)] | None = None
    requested_quantity_minor: Annotated[StrictInt, Field(gt=0, le=1_000_000_000)] | None = None
    requested_unit: OfferUnit | None = None
    people_requested: Annotated[StrictInt, Field(gt=0, le=100_000)] | None = None
    portions_per_person: Annotated[StrictInt, Field(gt=0, le=100)] | None = None
    dietary_requirements: list[Annotated[StrictStr, Field(min_length=2, max_length=40)]] = Field(default_factory=list, max_length=10)
    search_radius_km: Annotated[StrictFloat, Field(ge=1, le=20)] | None = None
    pickup_deadline: datetime | None = None

    @model_validator(mode="after")
    def valid_explicit_portion_basis(self) -> "RecoveryNeedInput":
        if self.portions_per_person is not None and self.people_requested is None:
            raise ValueError("people_requested is required with portions_per_person")
        if self.pickup_deadline is not None and self.pickup_deadline.tzinfo is None:
            raise ValueError("pickup deadline must include a timezone")
        return self


class RecoveryAssistantRequest(StrictModel):
    message: Annotated[StrictStr, Field(min_length=2, max_length=2_000)]
    origin: PickupBase
    structured: RecoveryNeedInput | None = None


class RecoveryPlanSuggestion(StrictModel):
    option_id: Annotated[StrictStr, Field(min_length=1, max_length=32)]
    strategy: Literal["coverage", "nearby"]
    explanation: Annotated[StrictStr, Field(min_length=1, max_length=240)]
    covered_quantity_minor: Annotated[StrictInt, Field(ge=0)]
    shortfall_quantity_minor: Annotated[StrictInt, Field(ge=0)]
    requested_quantity_minor: Annotated[StrictInt, Field(gt=0)]
    unit: OfferUnit
    stops: list["RecoverySuggestionStop"] = Field(max_length=5)


class RecoverySuggestionStop(StrictModel):
    offer: DiscoveredOffer
    requested_quantity_minor: Annotated[StrictInt, Field(gt=0)]


class RecoveryAssistantResponse(StrictModel):
    status: Literal["needs_clarification", "plans"]
    clarification: Annotated[StrictStr, Field(max_length=500)] | None = None
    need: "PlanNeed | None" = None
    plans: list[RecoveryPlanSuggestion] = Field(max_length=2)
    offers_capped: bool = False
    route_status: Literal["unavailable", "available"]


class PlanNeed(StrictModel):
    people_requested: Annotated[StrictInt, Field(gt=0, le=100_000)] | None = None
    target_portions: Annotated[StrictInt, Field(gt=0, le=1_000_000)] | None = None
    portions_per_person: Annotated[StrictInt, Field(gt=0, le=100)] | None = None
    item_query: Annotated[StrictStr, Field(min_length=2, max_length=80)] | None = None
    requested_quantity_minor: Annotated[StrictInt, Field(gt=0, le=1_000_000_000)] | None = None
    requested_unit: OfferUnit | None = None
    dietary_requirements: list[Annotated[StrictStr, Field(min_length=2, max_length=40)]] = Field(default_factory=list, max_length=10)
    pickup_deadline: datetime | None = None
    search_radius_km: Annotated[StrictFloat, Field(gt=0, le=20)] | None = None

    @model_validator(mode="after")
    def explicit_people_conversion(self) -> "PlanNeed":
        if self.target_portions is not None and self.people_requested is not None and self.portions_per_person is None:
            raise ValueError("state portions per person before comparing a people target")
        if self.portions_per_person is not None and self.people_requested is None:
            raise ValueError("people_requested is required when portions_per_person is supplied")
        if self.target_portions is not None and self.people_requested is not None and self.target_portions != self.people_requested * (self.portions_per_person or 0):
            raise ValueError("target_portions must match the explicit people conversion")
        recovery_fields = (self.item_query, self.requested_quantity_minor, self.requested_unit, self.pickup_deadline, self.search_radius_km)
        if any(value is not None for value in recovery_fields) and any(value is None for value in recovery_fields):
            raise ValueError("recovery requests require an item, quantity, unit, pickup deadline, and search radius")
        if self.pickup_deadline is not None and self.pickup_deadline.tzinfo is None:
            raise ValueError("pickup deadline must include a timezone")
        return self


class PlanStop(StrictModel):
    stop_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    offer_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    requested_quantity_minor: Annotated[StrictInt, Field(gt=0, le=1_000_000_000)]
    unit: OfferUnit
    expected_offer_version: Annotated[StrictInt, Field(ge=1)]
    demo_scenario: bool = False
    claim_id: Annotated[StrictStr, Field(min_length=1, max_length=128)] | None = None
    status: StopStatus = "SELECTED"
    available_quantity_minor: Annotated[StrictInt, Field(ge=0)] | None = None
    collected_quantity_minor: Annotated[StrictInt, Field(ge=0)] | None = None
    received_quantity_minor: Annotated[StrictInt, Field(ge=0)] | None = None
    failure_code: Annotated[StrictStr, Field(max_length=80)] | None = None
    version: Annotated[StrictInt, Field(ge=1)] = 1

    @model_validator(mode="after")
    def quantity_progress_is_valid(self) -> "PlanStop":
        if self.received_quantity_minor is not None and self.collected_quantity_minor is not None and self.received_quantity_minor > self.collected_quantity_minor:
            raise ValueError("received quantity cannot exceed collected quantity")
        return self


class RecoveryPlanCreate(StrictModel):
    name: Annotated[StrictStr, Field(min_length=1, max_length=100)] | None = None
    origin: PickupBase
    destination: PickupBase
    need: PlanNeed | None = None
    stops: list[PlanStop] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def unique_plan_stops(self) -> "RecoveryPlanCreate":
        ids = [stop.stop_id for stop in self.stops]
        offers = [stop.offer_id for stop in self.stops]
        if len(ids) != len(set(ids)) or len(offers) != len(set(offers)):
            raise ValueError("collection stops and offers must be unique")
        if any(stop.status != "SELECTED" or stop.claim_id for stop in self.stops):
            raise ValueError("new collections can contain only unreserved offers")
        return self


class RecoveryPlanUpdate(StrictModel):
    expected_version: Annotated[StrictInt, Field(ge=1)]
    name: Annotated[StrictStr, Field(min_length=1, max_length=100)] | None = None
    origin: PickupBase
    destination: PickupBase
    need: PlanNeed | None = None
    stops: list[PlanStop] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def unique_plan_stops(self) -> "RecoveryPlanUpdate":
        ids = [stop.stop_id for stop in self.stops]
        offers = [stop.offer_id for stop in self.stops]
        if len(ids) != len(set(ids)) or len(offers) != len(set(offers)):
            raise ValueError("collection stops and offers must be unique")
        return self


class RecoveryPlanRecord(StrictModel):
    plan_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    org_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    created_by: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    name: Annotated[StrictStr, Field(min_length=1, max_length=100)]
    origin: PickupBase
    destination: PickupBase
    need: PlanNeed | None = None
    stops: list[PlanStop] = Field(min_length=1, max_length=5)
    status: CollectionStatus
    version: Annotated[StrictInt, Field(ge=1)]
    created_at: datetime
    updated_at: datetime


class ReservePlanStop(StrictModel):
    expected_plan_version: Annotated[StrictInt, Field(ge=1)]
    expected_offer_version: Annotated[StrictInt, Field(ge=1)]


class ClaimCancel(StrictModel):
    expected_version: Annotated[StrictInt, Field(ge=1)]
    reason: Annotated[StrictStr, Field(min_length=2, max_length=280)]


class ClaimCollect(StrictModel):
    expected_version: Annotated[StrictInt, Field(ge=1)]
    collected_quantity_minor: Annotated[StrictInt, Field(ge=0, le=1_000_000_000)]
    reason: Annotated[StrictStr, Field(min_length=2, max_length=280)] | None = None

    @model_validator(mode="after")
    def zero_needs_reason(self) -> "ClaimCollect":
        if self.collected_quantity_minor == 0 and not self.reason:
            raise ValueError("a reason is required when no quantity was collected")
        return self


class ClaimReceive(StrictModel):
    expected_version: Annotated[StrictInt, Field(ge=1)]
    received_quantity_minor: Annotated[StrictInt, Field(ge=0, le=1_000_000_000)]
    reason: Annotated[StrictStr, Field(min_length=2, max_length=280)] | None = None

    @model_validator(mode="after")
    def zero_needs_reason(self) -> "ClaimReceive":
        if self.received_quantity_minor == 0 and not self.reason:
            raise ValueError("a reason is required when no quantity was received")
        return self


class ReceiptAdjustment(StrictModel):
    expected_version: Annotated[StrictInt, Field(ge=1)]
    corrected_quantity_minor: Annotated[StrictInt, Field(ge=0, le=1_000_000_000)]
    reason: Annotated[StrictStr, Field(min_length=3, max_length=280)]


class DonorHandover(StrictModel):
    expected_version: Annotated[StrictInt, Field(ge=1)]
    handed_over_quantity_minor: Annotated[StrictInt, Field(ge=0, le=1_000_000_000)]
    reason: Annotated[StrictStr, Field(min_length=2, max_length=280)] | None = None


class ClaimView(StrictModel):
    claim_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    plan_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    stop_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    offer_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    recipient_org_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    quantity_minor: Annotated[StrictInt, Field(gt=0)]
    unit: OfferUnit
    status: Literal["RESERVED", "COLLECTED", "RECEIVED", "CANCELLED", "EXPIRED"]
    collected_quantity_minor: Annotated[StrictInt, Field(ge=0)]
    received_quantity_minor: Annotated[StrictInt, Field(ge=0)]
    handed_over_quantity_minor: Annotated[StrictInt, Field(ge=0)] | None = None
    version: Annotated[StrictInt, Field(ge=1)]
    pickup_window_start: datetime
    pickup_window_end: datetime
    exact_address: Annotated[StrictStr, Field(min_length=5, max_length=500)] | None = None
    pickup_instructions: Annotated[StrictStr, Field(max_length=1000)] | None = None
    latitude: StrictFloat | None = None
    longitude: StrictFloat | None = None
    donor_kind: Literal["household", "business"]
    donor_owner_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]


class RouteRequest(StrictModel):
    plan_id: Annotated[StrictStr, Field(min_length=1, max_length=128)]
    claim_ids: list[Annotated[StrictStr, Field(min_length=1, max_length=128)]] = Field(min_length=1, max_length=5)

    @field_validator("claim_ids")
    @classmethod
    def unique_claims(cls, value: list[str]) -> list[str]:
        if len(set(value)) != len(value):
            raise ValueError("route claim IDs must be unique")
        return value


class RouteStop(StrictModel):
    claim_id: str
    stop_order: Annotated[StrictInt, Field(ge=1, le=5)]
    offer_id: str
    title: str
    address: str
    instructions: Annotated[StrictStr, Field(max_length=1000)]
    latitude: StrictFloat
    longitude: StrictFloat
    pickup_window_start: datetime
    pickup_window_end: datetime
    leg_duration_seconds: Annotated[StrictInt, Field(ge=0)] | None = None
    route_url: str


class CollectionRoute(StrictModel):
    plan_id: str
    provider: Literal["google_routes", "unavailable"]
    generated_at: datetime
    stops: list[RouteStop] = Field(max_length=5)
    total_duration_seconds: Annotated[StrictInt, Field(ge=0)] | None = None
    return_to_base_url: Annotated[StrictStr, Field(min_length=1, max_length=1000)] | None = None
    warning_codes: list[Annotated[StrictStr, Field(min_length=1, max_length=80)]] = Field(default_factory=list, max_length=10)


class ImpactRecord(StrictModel):
    claim_id: str
    offer_id: str
    plan_id: str
    donor_kind: Literal["household", "business"]
    donor_owner_id: str
    recipient_org_id: str
    offered_quantity_minor: Annotated[StrictInt, Field(gt=0)]
    collected_quantity_minor: Annotated[StrictInt, Field(ge=0)]
    received_quantity_minor: Annotated[StrictInt, Field(ge=0)]
    handed_over_quantity_minor: Annotated[StrictInt, Field(ge=0)] | None = None
    unit: OfferUnit
    recorded_at: datetime

    @model_validator(mode="after")
    def ledger_is_valid(self) -> "ImpactRecord":
        if self.collected_quantity_minor > self.offered_quantity_minor or self.received_quantity_minor > self.collected_quantity_minor:
            raise ValueError("impact quantity stages are inconsistent")
        if self.handed_over_quantity_minor is not None and self.handed_over_quantity_minor > self.offered_quantity_minor:
            raise ValueError("donor handover cannot exceed the reserved offer quantity")
        return self


class ImpactResult(StrictModel):
    records: list[ImpactRecord] = Field(max_length=100)
    cursor: Annotated[StrictStr, Field(min_length=1, max_length=256)] | None = None
    coverage: Literal["all_records", "loaded_page"]
