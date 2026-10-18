from __future__ import annotations

from typing import Any

from firebase_admin import firestore

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import ActorContext
from app.domain.recipient_access import assert_recipient_actor, require_donor_actor


MAX_PAGE = 100


def read_impact(actor: ActorContext, limit: int = MAX_PAGE, cursor: str | None = None) -> dict[str, Any]:
    """Return the same receipt-backed claim ledger to recipient and donor actors."""
    db = get_firestore()
    page_size = min(max(limit, 1), MAX_PAGE)
    try:
        if actor.actor_kind == "recipient_org":
            @firestore.transactional
            def authorize(transaction: Any) -> None:
                assert_recipient_actor(transaction, db, actor, "impact:read")
            authorize(db.transaction())
            query = db.collection("offer_claims").where("recipient_org_id", "==", actor.actor_id)
        else:
            if actor.actor_kind not in {"household", "business"}:
                raise DomainError("FORBIDDEN", "This actor cannot read offer impact.", 403)
            query = db.collection("offer_claims").where("donor_owner_id", "==", actor.actor_id)

        # Equality-only queries use Firestore single-field indexes. Keep this
        # bounded and advance by document name for stable cursor pagination.
        if cursor is not None:
            cursor_snapshot = db.collection("offer_claims").document(cursor).get()
            cursor_claim = cursor_snapshot.to_dict() if cursor_snapshot.exists else None
            scope_field = "recipient_org_id" if actor.actor_kind == "recipient_org" else "donor_owner_id"
            expected_kind = "business" if actor.actor_kind == "business" else "household"
            if (
                not cursor_claim or cursor_claim.get(scope_field) != actor.actor_id
                or (actor.actor_kind != "recipient_org" and cursor_claim.get("donor_kind") != expected_kind)
            ):
                raise DomainError("VALIDATION_ERROR", "The impact cursor is invalid for this actor.", 400)
            query = query.start_after(cursor_snapshot)
        claims = query.limit(page_size + 1).stream()
        snapshots = list(claims)
        has_more = len(snapshots) > page_size
        snapshots = snapshots[:page_size]
        records: list[dict[str, Any]] = []
        for snapshot in snapshots:
            claim = snapshot.to_dict() or {}
            if not claim.get("plan_id") or not claim.get("stop_id"):
                # Legacy standalone claims do not have collection lifecycle or
                # receipt events and are intentionally excluded from this view.
                continue
            offer_id = claim.get("offer_id")
            if not isinstance(offer_id, str) or not offer_id:
                raise DomainError("DATA_UNAVAILABLE", "A receipt record has an invalid offer reference.", 503, True)
            offer_snapshot = db.collection("surplus_offers").document(offer_id).get()
            offer = offer_snapshot.to_dict() if offer_snapshot.exists else None
            if not offer:
                raise DomainError("DATA_UNAVAILABLE", "A receipt source offer is missing.", 503, True)
            donor = offer.get("donor") or {}
            if actor.actor_kind == "recipient_org":
                if claim.get("recipient_org_id") != actor.actor_id:
                    continue
            else:
                expected_kind = "business" if actor.actor_kind == "business" else "household"
                if claim.get("donor_kind") != expected_kind or claim.get("donor_owner_id") != actor.actor_id:
                    continue
                @firestore.transactional
                def authorize_donor(transaction: Any) -> None:
                    require_donor_actor(transaction, db, actor, offer, "offer:read")
                authorize_donor(db.transaction())
                if donor.get("kind") != expected_kind or donor.get("owner_id") != actor.actor_id:
                    continue
            if claim.get("status") != "RECEIVED":
                continue
            offered = _quantity(claim.get("quantity_minor"), "reserved quantity", allow_zero=False)
            collected = _quantity(claim.get("collected_quantity_minor", 0), "collected quantity")
            received = _quantity(claim.get("received_quantity_minor", 0), "received quantity")
            if received > collected or collected > offered:
                raise DomainError("DATA_UNAVAILABLE", "A receipt quantity ledger is inconsistent.", 503, True)
            records.append({
                "claim_id": snapshot.id,
                "offer_id": offer_id,
                "plan_id": claim["plan_id"],
                "donor_kind": donor.get("kind"),
                "donor_owner_id": donor.get("owner_id"),
                "recipient_org_id": claim.get("recipient_org_id"),
                "offered_quantity_minor": offered,
                "collected_quantity_minor": collected,
                "received_quantity_minor": received,
                "handed_over_quantity_minor": claim.get("handed_over_quantity_minor"),
                "unit": claim.get("unit"),
                "recorded_at": claim.get("received_at") or claim.get("collected_at") or claim.get("reserved_at"),
            })
        return {
            "records": records,
            "cursor": snapshots[-1].id if has_more and snapshots else None,
            "coverage": "loaded_page" if has_more or cursor is not None else "all_records",
        }
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Receipt impact could not be read.", 503, True) from exc


def _quantity(value: Any, label: str, *, allow_zero: bool = True) -> int:
    minimum = 0 if allow_zero else 1
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise DomainError("DATA_UNAVAILABLE", f"The stored {label} is invalid.", 503, True)
    return value
