from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from firebase_admin import firestore

from app.core.config import settings
from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import ActorContext
from app.domain.recipient_access import assert_recipient_actor
from app.schemas.recipient import CollectionRoute, PickupBase, RecoveryPlanSuggestion, RouteRequest, RouteStop


_DURATION = re.compile(r"^(\d+(?:\.\d+)?)s$")
_ROUTES_DAILY_LIMIT = 20


def _consume_route_quota(db: Any, org_id: str) -> None:
    day = datetime.now(timezone.utc).date().isoformat()
    ref = db.collection("recovery_route_limits").document(f"{org_id}_{day}")

    @firestore.transactional
    def commit(transaction: Any) -> None:
        snapshot = ref.get(transaction=transaction)
        record = snapshot.to_dict() if snapshot.exists else {}
        count = record.get("request_count", 0)
        if isinstance(count, bool) or not isinstance(count, int) or count < 0:
            raise DomainError("DATA_UNAVAILABLE", "The route request limit record is invalid.", 503, True)
        if count >= _ROUTES_DAILY_LIMIT:
            raise DomainError("ROUTE_DAILY_LIMIT", "Today's route limit has been reached. Use the saved pickup details or try again tomorrow.", 429)
        transaction.set(ref, {"org_id": org_id, "day": day, "request_count": count + 1, "updated_at": firestore.SERVER_TIMESTAMP})

    commit(db.transaction())


def _duration_seconds(value: Any) -> int | None:
    if not isinstance(value, str):
        return None
    match = _DURATION.fullmatch(value)
    return round(float(match.group(1))) if match else None


def _waypoint(latitude: float, longitude: float) -> dict[str, Any]:
    return {"location": {"latLng": {"latitude": latitude, "longitude": longitude}}}


def _maps_url(latitude: float, longitude: float) -> str:
    return "https://www.google.com/maps/dir/?" + urlencode({"api": "1", "destination": f"{latitude},{longitude}", "travelmode": "driving"})


def _route_response(
    plan_id: str,
    origin: dict[str, Any],
    destination: dict[str, Any],
    claims: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], int | None, int | None, list[str], str]:
    """Return optimized claim order and legs; provider failure remains explicit."""
    api_key = settings.GOOGLE_MAPS_ROUTES_API_KEY
    if not api_key:
        return claims, None, None, ["ROUTES_PROVIDER_UNAVAILABLE"], "unavailable"
    body = {
        "origin": _waypoint(float(origin["latitude"]), float(origin["longitude"])),
        "destination": _waypoint(float(destination["latitude"]), float(destination["longitude"])),
        "intermediates": [
            _waypoint(float(item["latitude"]), float(item["longitude"])) for item in claims
        ],
        "travelMode": "DRIVE",
        "optimizeWaypointOrder": True,
        "routingPreference": "TRAFFIC_UNAWARE",
    }
    try:
        response = httpx.post(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            json=body,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key.get_secret_value(),
                "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.legs.duration,routes.optimizedIntermediateWaypointIndex",
            },
            timeout=8.0,
        )
        response.raise_for_status()
        data = response.json()
        routes = data.get("routes")
        if not isinstance(routes, list) or not routes or not isinstance(routes[0], dict):
            raise ValueError("missing route")
        route = routes[0]
        indexes = route.get("optimizedIntermediateWaypointIndex")
        if not isinstance(indexes, list) or sorted(indexes) != list(range(len(claims))):
            raise ValueError("invalid waypoint order")
        ordered = [claims[index] for index in indexes]
        legs = route.get("legs")
        durations: list[int | None] = []
        if isinstance(legs, list):
            durations = [_duration_seconds(leg.get("duration")) if isinstance(leg, dict) else None for leg in legs]
        total = _duration_seconds(route.get("duration"))
        distance = route.get("distanceMeters")
        if isinstance(distance, bool) or not isinstance(distance, int) or distance < 0:
            distance = None
        # Google returns the route legs in its optimized order: leg i ends at stop i.
        for index, item in enumerate(ordered):
            item["leg_duration_seconds"] = durations[index] if index < len(durations) else None
        warnings: list[str] = []
        if total is None or any(item.get("leg_duration_seconds") is None for item in ordered):
            warnings.append("TRAVEL_TIME_UNAVAILABLE")
        return ordered, total, distance, warnings, "google_routes"
    except Exception:
        return claims, None, None, ["ROUTES_PROVIDER_UNAVAILABLE"], "unavailable"


def route_recovery_suggestion(
    org_id: str,
    origin: PickupBase,
    suggestion: RecoveryPlanSuggestion,
) -> tuple[RecoveryPlanSuggestion, bool]:
    """Order a proposed plan with Google Routes using only coarse public offer coordinates."""
    if not settings.GOOGLE_MAPS_ROUTES_API_KEY or not suggestion.stops:
        return suggestion, False
    try:
        _consume_route_quota(get_firestore(), org_id)
    except DomainError as exc:
        if exc.code == "ROUTE_DAILY_LIMIT":
            return suggestion, False
        raise
    origin_data = origin.model_dump()
    route_points = [
        {
            "offer_id": stop.offer.offer_id,
            "latitude": stop.offer.approximate_latitude,
            "longitude": stop.offer.approximate_longitude,
        }
        for stop in suggestion.stops
    ]
    ordered, duration, distance, _warnings, provider = _route_response(
        suggestion.option_id, origin_data, origin_data, route_points
    )
    if provider != "google_routes" or len(ordered) != len(suggestion.stops):
        return suggestion, False
    by_offer_id = {stop.offer.offer_id: stop for stop in suggestion.stops}
    try:
        stops = [by_offer_id[point["offer_id"]] for point in ordered]
    except (KeyError, TypeError):
        return suggestion, False
    return suggestion.model_copy(update={
        "stops": stops,
        "route_duration_seconds": duration,
        "route_distance_meters": distance,
    }), duration is not None and distance is not None


def build_recovery_route(actor: ActorContext, command: RouteRequest) -> CollectionRoute:
    if actor.actor_kind != "recipient_org":
        raise DomainError("FORBIDDEN", "Only recipient organizations can request collection routes.", 403)
    db = get_firestore()
    try:
        organization = assert_recipient_actor(None, db, actor, "route:read")
        plan_ref = db.collection("recovery_plans").document(command.plan_id)
        plan_snapshot = plan_ref.get()
        plan = plan_snapshot.to_dict() if plan_snapshot.exists else None
        if not plan or plan.get("org_id") != actor.actor_id:
            raise DomainError("NOT_FOUND", "The collection was not found.", 404)
        origin = plan.get("origin")
        destination = plan.get("destination")
        if not isinstance(origin, dict) or not isinstance(destination, dict):
            raise DomainError("DATA_UNAVAILABLE", "The saved collection route endpoints are invalid.", 503, True)
        stop_by_claim: dict[str, dict[str, Any]] = {}
        for stop in plan.get("stops", []):
            if isinstance(stop, dict) and isinstance(stop.get("claim_id"), str):
                stop_by_claim[stop["claim_id"]] = stop
        if any(claim_id not in stop_by_claim for claim_id in command.claim_ids):
            raise DomainError("FORBIDDEN", "Every route stop must belong to this collection.", 403)
        requested_claims = set(command.claim_ids)
        ordered_claim_ids = [
            stop["claim_id"] for stop in plan.get("stops", [])
            if isinstance(stop, dict) and stop.get("claim_id") in requested_claims
        ]
        claims: list[dict[str, Any]] = []
        for claim_id in ordered_claim_ids:
            stop = stop_by_claim[claim_id]
            claim_snapshot = db.collection("offer_claims").document(claim_id).get()
            claim = claim_snapshot.to_dict() if claim_snapshot.exists else None
            if (
                not claim or claim.get("claim_id") != claim_id
                or claim.get("recipient_org_id") != actor.actor_id
                or claim.get("org_id") != actor.actor_id
                or claim.get("plan_id") != command.plan_id
                or claim.get("stop_id") != stop.get("stop_id")
                or claim.get("status") != "RESERVED"
            ):
                raise DomainError("CLAIM_NOT_ROUTABLE", "Only active reservations in this collection can be routed.", 409)
            pickup_end = claim.get("pickup_window_end")
            if not isinstance(pickup_end, datetime) or pickup_end.tzinfo is None or pickup_end <= datetime.now(timezone.utc):
                raise DomainError("PICKUP_WINDOW_CLOSED", "This pickup window has ended. Cancel the reservation or refresh the collection before routing.", 409)
            offer_id = claim.get("offer_id")
            offer_snapshot = db.collection("surplus_offers").document(str(offer_id)).get()
            offer = offer_snapshot.to_dict() if offer_snapshot.exists else None
            if not offer or offer.get("offer_id") != offer_id:
                raise DomainError("DATA_UNAVAILABLE", "A reserved offer record is missing.", 503, True)
            expiry = offer.get("expiry_at")
            if isinstance(expiry, datetime) and (expiry.tzinfo is None or expiry <= datetime.now(timezone.utc)):
                raise DomainError("PICKUP_WINDOW_CLOSED", "This food's donor-declared expiry has passed. Cancel the reservation before routing.", 409)
            donor = offer.get("donor") or {}
            latitude, longitude = offer.get("latitude"), offer.get("longitude")
            address, instructions = offer.get("exact_address"), offer.get("pickup_instructions", "")
            if (
                not isinstance(donor, dict) or donor.get("kind") != claim.get("donor_kind")
                or donor.get("owner_id") != claim.get("donor_owner_id")
                or isinstance(latitude, bool) or not isinstance(latitude, (int, float))
                or isinstance(longitude, bool) or not isinstance(longitude, (int, float))
                or not isinstance(address, str) or len(address.strip()) < 5
                or not isinstance(instructions, str)
            ):
                raise DomainError("DATA_UNAVAILABLE", "A reserved pickup location is incomplete.", 503, True)
            claims.append({
                "claim_id": claim_id,
                "stop_order": 0,
                "offer_id": offer_id,
                "title": str(offer.get("title") or "Food pickup"),
                "address": address,
                "instructions": instructions,
                "latitude": float(latitude),
                "longitude": float(longitude),
                "pickup_window_start": claim.get("pickup_window_start"),
                "pickup_window_end": claim.get("pickup_window_end"),
                "route_url": _maps_url(float(latitude), float(longitude)),
            })
        if settings.GOOGLE_MAPS_ROUTES_API_KEY:
            _consume_route_quota(db, actor.actor_id)
        ordered, total, _distance, warnings, provider = _route_response(command.plan_id, origin, destination, claims)
        route_stops: list[RouteStop] = []
        for index, item in enumerate(ordered, 1):
            item["stop_order"] = index
            route_stops.append(RouteStop.model_validate(item))
        if provider == "google_routes" and total is not None:
            current_timestamp = datetime.now(timezone.utc).timestamp()
            elapsed = 0
            for item in route_stops:
                elapsed += item.leg_duration_seconds or 0
                estimated_arrival = current_timestamp + elapsed
                pickup_start = item.pickup_window_start.timestamp()
                pickup_end = item.pickup_window_end.timestamp()
                if estimated_arrival < pickup_start:
                    elapsed += round(pickup_start - estimated_arrival)
                    estimated_arrival = pickup_start
                if pickup_end < estimated_arrival:
                    warnings.append("PICKUP_WINDOW_MAY_BE_MISSED")
                    break
                # The first-version stop allowance is an explicit estimate, not a scheduled guarantee.
                elapsed += 20 * 60
        return CollectionRoute(
            plan_id=command.plan_id,
            provider=provider,
            generated_at=datetime.now(timezone.utc),
            stops=route_stops,
            total_duration_seconds=total,
            return_to_base_url=_maps_url(float(destination["latitude"]), float(destination["longitude"])) if route_stops else None,
            warning_codes=list(dict.fromkeys(warnings)),
        )
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The collection route could not be prepared.", 503, True) from exc
