from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from google.cloud.firestore_v1.base_query import FieldFilter

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import authenticated_uid

router = APIRouter()


@router.get("/households", response_model=dict[str, Any])
def list_my_households(request: Request, uid: str = Depends(authenticated_uid)) -> dict[str, Any]:
    """Return only active memberships belonging to the verified Firebase UID."""
    db = get_firestore()
    try:
        memberships = db.collection_group("members").where(filter=FieldFilter("uid", "==", uid)).limit(200).stream()
        result = []
        for membership in memberships:
            data = membership.to_dict() or {}
            if data.get("uid") != uid or data.get("status") != "ACTIVE" or data.get("role") not in {"OWNER", "MEMBER"}:
                continue
            household_ref = membership.reference.parent.parent
            if household_ref is None:
                continue
            household = household_ref.get()
            household_data = household.to_dict() if household.exists else None
            name = household_data.get("name") if household_data else None
            if isinstance(name, str) and name.strip():
                result.append({"household_id": household_ref.id, "name": name, "role": data["role"]})
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Your household list is unavailable.", 503, True) from exc
    result.sort(key=lambda row: (row["name"].casefold(), row["household_id"]))
    return {"schema_version": 1, "request_id": request.state.request_id, "result": {"households": result[:50]}}
