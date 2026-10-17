from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any

from firebase_admin import firestore

from app.core.config import settings
from app.core.errors import DomainError
from app.core.firestore import get_firestore


def claim_daily_ai_request(uid: str) -> None:
    """Reserve one paid model call from the user's daily UTC allowance."""
    db = get_firestore()
    actor_scope = hashlib.sha256(uid.encode("utf-8")).hexdigest()
    ref = db.collection("ai_usage").document(actor_scope)
    day = datetime.now(timezone.utc).date().isoformat()

    @firestore.transactional
    def claim(transaction: Any) -> None:
        snapshot = ref.get(transaction=transaction)
        previous = snapshot.to_dict() if snapshot.exists else {}
        count = previous.get("count", 0) if previous.get("day") == day else 0
        if isinstance(count, bool) or not isinstance(count, int) or count < 0:
            raise DomainError("AI_USAGE_UNAVAILABLE", "The assistant request limit could not be checked.", 503, True)
        if count >= settings.AI_DAILY_REQUEST_LIMIT:
            raise DomainError(
                "AI_DAILY_LIMIT",
                "This account has reached today's assistant request limit. Please try again tomorrow.",
                429,
            )
        transaction.set(ref, {"day": day, "count": count + 1}, merge=True)

    try:
        claim(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("AI_USAGE_UNAVAILABLE", "The assistant request limit could not be checked.", 503, True) from exc
