from __future__ import annotations

from typing import Any

import firebase_admin
from firebase_admin import firestore

from app.core.config import settings
from app.core.errors import DomainError


def get_firestore() -> Any:
    try:
        try:
            app = firebase_admin.get_app()
        except ValueError:
            options = {"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None
            app = firebase_admin.initialize_app(options=options)
        return firestore.client(app=app)
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Household data is unavailable.", 503, retryable=True) from exc
