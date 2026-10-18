from __future__ import annotations

import base64
import hashlib
import json
import math
from datetime import datetime, time, timedelta, timezone
from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import ActorContext
from app.schemas.recipient import DiscoveredOffer, DiscoveryResult, OfferDiscoveryQuery


_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
_PAGE_SIZE = 25
_SCAN_LIMIT = 500
_LEGACY_SCAN_LIMIT = 100


def _geohash(latitude: float, longitude: float, precision: int) -> str:
    lat_range = [-90.0, 90.0]
    lon_range = [-180.0, 180.0]
    bits = [16, 8, 4, 2, 1]
    result: list[str] = []
    even = True
    bit_index = char_index = 0
    while len(result) < precision:
        current_range = lon_range if even else lat_range
        value = longitude if even else latitude
        midpoint = (current_range[0] + current_range[1]) / 2
        if value >= midpoint:
            char_index |= bits[bit_index]
            current_range[0] = midpoint
        else:
            current_range[1] = midpoint
        even = not even
        if bit_index < 4:
            bit_index += 1
        else:
            result.append(_BASE32[char_index])
            bit_index = char_index = 0
    return "".join(result)


def _prefixes_for_circle(latitude: float, longitude: float, radius_km: float) -> list[str]:
    # Cover every geohash cell intersecting the circle's bounding box. Exact haversine
    # filtering below removes the box corners. Precision adapts to keep query fan-out bounded.
    precision = 6 if radius_km <= 2 else 5 if radius_km <= 8 else 4
    lat_step = 180 / (2 ** (precision * 5 // 2))
    lon_step = 360 / (2 ** ((precision * 5 + 1) // 2))
    lat_delta = radius_km / 110.574
    cos_lat = max(0.01, math.cos(math.radians(latitude)))
    lon_delta = min(180.0, radius_km / (111.320 * cos_lat))
    low_lat = max(-90.0, latitude - lat_delta)
    high_lat = min(90.0, latitude + lat_delta)
    low_lon = max(-180.0, longitude - lon_delta)
    high_lon = min(180.0, longitude + lon_delta)
    prefixes: set[str] = set()
    lat = low_lat
    while lat <= high_lat + lat_step:
        lon = low_lon
        while lon <= high_lon + lon_step:
            prefixes.add(_geohash(min(89.999999, lat), min(179.999999, lon), precision))
            lon += lon_step
        lat += lat_step
    # Include points on the upper edges when they fall in a new cell.
    for lat, lon in ((high_lat, low_lon), (low_lat, high_lon), (high_lat, high_lon)):
        prefixes.add(_geohash(min(89.999999, lat), min(179.999999, lon), precision))
    if len(prefixes) > 200:
        raise DomainError("SEARCH_TOO_BROAD", "This search area cannot be covered safely. Reduce the radius.", 422)
    return sorted(prefixes)


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius = 6371.0088
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    return earth_radius * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))


def _query_hash(query: OfferDiscoveryQuery) -> str:
    values = query.model_dump(exclude={"cursor"}, mode="json")
    return hashlib.sha256(json.dumps(values, sort_keys=True, separators=(",", ":")).encode()).hexdigest()[:20]


def _decode_cursor(cursor: str | None, filter_hash: str) -> tuple[float, str] | None:
    if not cursor:
        return None
    try:
        raw = base64.urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4))
        payload = json.loads(raw)
        if payload.get("q") != filter_hash or not isinstance(payload.get("d"), (int, float)) or not isinstance(payload.get("id"), str):
            raise ValueError
        return float(payload["d"]), payload["id"]
    except Exception as exc:
        raise DomainError("INVALID_CURSOR", "The discovery cursor is invalid or belongs to another search.", 400) from exc


def _encode_cursor(filter_hash: str, distance: float, offer_id: str) -> str:
    raw = json.dumps({"q": filter_hash, "d": round(distance, 6), "id": offer_id}, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _pickup_state_matches(offer: dict[str, Any], state: str, now: datetime) -> bool:
    if state == "any":
        return True
    start, end = offer.get("pickup_window_start"), offer.get("pickup_window_end")
    if not isinstance(start, datetime) or not isinstance(end, datetime):
        return False
    if state == "available_now":
        return start <= now <= end
    day_end = datetime.combine(now.date() + timedelta(days=1), time.min, tzinfo=timezone.utc)
    return start < day_end and end >= now


def _public_discovered(offer: dict[str, Any], distance: float) -> dict[str, Any] | None:
    donor = offer.get("donor")
    latitude, longitude = offer.get("latitude"), offer.get("longitude")
    if (
        not isinstance(donor, dict) or donor.get("kind") not in {"household", "business"}
        or isinstance(latitude, bool) or not isinstance(latitude, (int, float))
        or isinstance(longitude, bool) or not isinstance(longitude, (int, float))
    ):
        return None
    return {
        "offer_id": offer.get("offer_id"),
        "title": offer.get("title"),
        "category": offer.get("category"),
        "tags": offer.get("tags", []),
        "donor_kind": donor["kind"],
        "quantity_available_minor": offer.get("quantity_available_minor"),
        "unit": offer.get("unit"),
        "expiry_declaration": offer.get("expiry_declaration", "UNKNOWN"),
        "expiry_at": offer.get("expiry_at"),
        "condition_declaration": offer.get("condition_declaration", "UNKNOWN"),
        "storage_declaration": offer.get("storage_declaration", "UNKNOWN"),
        "allergen_declaration": offer.get("allergen_declaration", "UNKNOWN"),
        "pickup_window_start": offer.get("pickup_window_start"),
        "pickup_window_end": offer.get("pickup_window_end"),
        # Synthetic fixture areas are reviewed coarse labels; arbitrary donor
        # text remains hidden until a claim is active.
        "approximate_area": (
            offer.get("approximate_area", "Bengaluru demo area")
            if offer.get("demo_scenario") is True
            else "Approximate pickup area"
        ),
        # Rounded coordinates are coarse discovery markers, never route coordinates.
        "approximate_latitude": round(float(latitude), 2),
        "approximate_longitude": round(float(longitude), 2),
        "approximate_distance_km": round(distance, 1),
        "status": offer.get("status"),
        "version": offer.get("version"),
        "demo_scenario": offer.get("demo_scenario") is True,
    }


def discover_offers(actor: ActorContext, query: OfferDiscoveryQuery) -> DiscoveryResult:
    if actor.actor_kind != "recipient_org":
        raise DomainError("FORBIDDEN", "Only recipient organizations can search recovery offers.", 403)
    from app.domain.recipient_access import assert_recipient_actor

    db = get_firestore()
    now = datetime.now(timezone.utc)
    filter_hash = _query_hash(query)
    after = _decode_cursor(query.cursor, filter_hash)
    try:
        assert_recipient_actor(None, db, actor, "offer:search")
        collection = db.collection("surplus_offers")
        documents: dict[str, dict[str, Any]] = {}
        legacy_capped = False
        for prefix in _prefixes_for_circle(query.latitude, query.longitude, query.radius_km):
            snapshots = (
                collection.where("visibility", "==", "PUBLIC")
                .where("status", "in", ["OPEN", "PARTIALLY_RESERVED"])
                .where("geohash", ">=", prefix)
                .where("geohash", "<=", prefix + "~")
                .order_by("geohash")
                .limit(_SCAN_LIMIT + 1)
                .stream()
            )
            for snapshot in snapshots:
                data = snapshot.to_dict() or {}
                offer_id = data.get("offer_id", snapshot.id)
                if isinstance(offer_id, str):
                    documents[offer_id] = data
                if len(documents) > _SCAN_LIMIT:
                    break
            if len(documents) > _SCAN_LIMIT:
                break

        # Compatibility while older public offers are backfilled with geohash on edit/publish.
        # This scan is deliberately bounded and advertises incompleteness when it fills its cap.
        legacy_snapshots = list(
            collection.where("visibility", "==", "PUBLIC")
            .where("status", "in", ["OPEN", "PARTIALLY_RESERVED"])
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(_LEGACY_SCAN_LIMIT)
            .stream()
        )
        legacy_capped = len(legacy_snapshots) >= _LEGACY_SCAN_LIMIT
        for snapshot in legacy_snapshots:
            data = snapshot.to_dict() or {}
            if data.get("geohash"):
                continue
            offer_id = data.get("offer_id", snapshot.id)
            if isinstance(offer_id, str):
                documents.setdefault(offer_id, data)

        capped = len(documents) > _SCAN_LIMIT or legacy_capped
        candidates: list[tuple[float, str, dict[str, Any]]] = []
        needle = (query.query or "").strip().casefold()
        query_terms = [part for part in needle.split() if part]
        for offer_id, offer in documents.items():
            if offer.get("offer_id", offer_id) != offer_id or offer.get("visibility") != "PUBLIC":
                continue
            if offer.get("demo_scenario") is True and offer.get("demo_scenario_org_id") != actor.actor_id:
                continue
            if offer.get("status") not in {"OPEN", "PARTIALLY_RESERVED"}:
                continue
            demo_scenario = offer.get("demo_scenario") is True
            if not demo_scenario and (offer.get("condition_declaration") != "DONOR_CONFIRMED_SUITABLE" or offer.get("storage_declaration") not in {"AMBIENT", "CHILLED", "FROZEN"}):
                continue
            available = offer.get("quantity_available_minor")
            if isinstance(available, bool) or not isinstance(available, int) or available <= 0:
                continue
            start, end = offer.get("pickup_window_start"), offer.get("pickup_window_end")
            if not isinstance(start, datetime) or not isinstance(end, datetime) or start.tzinfo is None or end.tzinfo is None or end <= now or end <= start:
                continue
            expiry = offer.get("expiry_at")
            if expiry is not None and (not isinstance(expiry, datetime) or expiry.tzinfo is None or expiry <= now):
                continue
            if query.category and str(offer.get("category", "")).casefold() != query.category.casefold():
                continue
            searchable = (str(offer.get("title", "")) + " " + str(offer.get("category", ""))).casefold()
            if needle and not all(term in searchable for term in query_terms):
                continue
            if not _pickup_state_matches(offer, query.pickup_state, now):
                continue
            lat, lon = offer.get("latitude"), offer.get("longitude")
            if isinstance(lat, bool) or not isinstance(lat, (int, float)) or isinstance(lon, bool) or not isinstance(lon, (int, float)):
                continue
            distance = _distance_km(query.latitude, query.longitude, float(lat), float(lon))
            if distance <= query.radius_km:
                candidates.append((distance, offer_id, offer))
        candidates.sort(key=lambda item: (round(item[0], 6), item[1]))
        if after:
            candidates = [item for item in candidates if (round(item[0], 6), item[1]) > (round(after[0], 6), after[1])]
        page = candidates[:_PAGE_SIZE]
        offers = [DiscoveredOffer.model_validate(_public_discovered(offer, distance)) for distance, _, offer in page]
        more = capped or len(candidates) > _PAGE_SIZE
        next_cursor = _encode_cursor(filter_hash, page[-1][0], page[-1][1]) if more and page else None
        return DiscoveryResult(offers=offers, next_cursor=next_cursor, capped=capped)
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Nearby offers could not be searched.", 503, True) from exc
