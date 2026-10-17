from __future__ import annotations

import base64
from typing import Any

from firebase_admin import firestore
from google.cloud.firestore_v1.field_path import FieldPath

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import Principal
from app.schemas.meal_plan_reads import SavedMealPlan


PAGE_MAX = 100


def _decode_cursor(cursor: str | None) -> str | None:
    if cursor is None:
        return None
    try:
        value = base64.urlsafe_b64decode(cursor.encode("ascii") + b"=" * (-len(cursor) % 4)).decode("ascii")
        if not value or len(value) > 128 or any(
            ch not in "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-" for ch in value
        ):
            raise ValueError("invalid cursor")
        return value
    except Exception as exc:
        raise DomainError("INVALID_CURSOR", "The meal-plan cursor is invalid.", 422) from exc


def _encode_cursor(document_id: str) -> str:
    return base64.urlsafe_b64encode(document_id.encode("ascii")).decode("ascii").rstrip("=")


def _assert_active_membership(db: Any, principal: Principal) -> None:
    membership_ref = (
        db.collection("households")
        .document(principal.household_id)
        .collection("members")
        .document(principal.uid)
    )
    membership = membership_ref.get()
    data = membership.to_dict() if membership.exists else None
    if (
        not data
        or data.get("uid") != principal.uid
        or data.get("status") != "ACTIVE"
        or data.get("role") != principal.role
        or principal.role not in {"OWNER", "MEMBER"}
    ):
        raise DomainError("FORBIDDEN", "The requested household membership is not available.", 403)


def _read_plan(snapshot: Any, household_id: str) -> dict[str, Any]:
    data = snapshot.to_dict() or {}
    if (
        data.get("plan_id") != snapshot.id
        or data.get("household_id") != household_id
        or isinstance(data.get("version"), bool)
        or not isinstance(data.get("version"), int)
        or data["version"] < 1
    ):
        raise ValueError("invalid persisted meal plan identity or version")
    raw_ingredients = data.get("ingredients")
    if not isinstance(raw_ingredients, list) or len(raw_ingredients) > 50:
        raise ValueError("invalid persisted meal plan ingredients")
    # Construct an allowlisted response from persisted candidate fields only.
    ingredients = []
    for source in raw_ingredients:
        if not isinstance(source, dict):
            raise ValueError("invalid persisted meal plan ingredient")
        ingredients.append({
            "item_id": source.get("item_id"),
            "name": source.get("name"),
            "amount": source.get("amount"),
            "unit": source.get("unit"),
            "uncertain": source.get("uncertain"),
            "quantity_basis": source.get("quantity_basis"),
            "scaled_from_amount": source.get("scaled_from_amount"),
        })
    return SavedMealPlan.model_validate({
        "plan_id": data["plan_id"],
        "title": data.get("title"),
        "servings": data.get("servings"),
        "preparation_stage": data.get("preparation_stage"),
        "version": data["version"],
        "created_at": data.get("created_at"),
        "ingredients": ingredients,
    }).model_dump(mode="python")


def list_saved_meal_plans(principal: Principal, limit: int = 25, cursor: str | None = None) -> dict[str, Any]:
    if not 1 <= limit <= PAGE_MAX:
        raise DomainError("INVALID_LIMIT", "The page limit must be between 1 and 100.", 422)
    try:
        db = get_firestore()
        _assert_active_membership(db, principal)
        household = db.collection("households").document(principal.household_id)
        collection = household.collection("meal_plans")
        query = (
            collection.order_by("created_at", direction=firestore.Query.DESCENDING)
            .order_by(FieldPath.document_id(), direction=firestore.Query.DESCENDING)
        )
        cursor_id = _decode_cursor(cursor)
        if cursor_id is not None:
            cursor_snapshot = collection.document(cursor_id).get()
            cursor_data = cursor_snapshot.to_dict() if cursor_snapshot.exists else None
            if not cursor_data or cursor_data.get("household_id") != principal.household_id:
                raise DomainError("INVALID_CURSOR", "The meal-plan cursor is unavailable.", 422)
            query = query.start_after(cursor_snapshot)
        snapshots = list(query.limit(limit + 1).stream())
        has_more = len(snapshots) > limit
        page = snapshots[:limit]
        plans = [_read_plan(snapshot, principal.household_id) for snapshot in page]
        next_cursor = _encode_cursor(page[-1].id) if has_more and page else None
        return {"schema_version": 1, "plans": plans, "next_cursor": next_cursor}
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Saved meal plans are unavailable.", 503, True) from exc
