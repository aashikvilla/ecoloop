from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import Literal

import firebase_admin
from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
from firebase_admin.exceptions import FirebaseError

from app.core.config import settings
from app.core.errors import DomainError
from app.core.firestore import get_firestore


bearer = HTTPBearer(auto_error=False)
HOUSEHOLD_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
ACTOR_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


def organization_membership_document_id(org_id: str, uid: str) -> str:
    """Build a collision-safe key; the stored membership remains self-describing."""
    return hashlib.sha256(f"{org_id}\0{uid}".encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Principal:
    uid: str
    household_id: str
    role: str


@dataclass(frozen=True)
class ActorContext:
    """An authenticated, server-resolved actor scope for social-impact APIs."""

    uid: str
    actor_kind: Literal["household", "business", "recipient_org"]
    actor_id: str
    role: str
    permissions: tuple[str, ...]
    membership_version: int
    organization_status: str | None = None


def _firebase_app() -> firebase_admin.App:
    try:
        return firebase_admin.get_app()
    except ValueError:
        options = {"projectId": settings.FIREBASE_PROJECT_ID} if settings.FIREBASE_PROJECT_ID else None
        try:
            return firebase_admin.initialize_app(options=options)
        except Exception as exc:
            raise DomainError(
                "IDENTITY_UNAVAILABLE",
                "Identity verification is unavailable.",
                503,
                retryable=True,
            ) from exc


async def authenticated_uid(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer" or len(credentials.credentials) > 8_192:
        raise HTTPException(status_code=401)
    try:
        claims = auth.verify_id_token(credentials.credentials, app=_firebase_app(), check_revoked=True)
    except (auth.InvalidIdTokenError, auth.ExpiredIdTokenError, auth.RevokedIdTokenError, auth.UserDisabledError, ValueError):
        raise HTTPException(status_code=401) from None
    except FirebaseError as exc:
        raise DomainError("IDENTITY_UNAVAILABLE", "Identity verification is unavailable.", 503, True) from exc
    except Exception as exc:
        # Missing ADC, project configuration or verifier initialization is an outage, never a local bypass.
        raise DomainError("IDENTITY_UNAVAILABLE", "Identity verification is unavailable.", 503, True) from exc
    uid = claims.get("uid")
    if not isinstance(uid, str) or not uid or len(uid) > 128:
        raise HTTPException(status_code=401)
    return uid


async def current_principal(
    uid: str = Depends(authenticated_uid),
    household_id: str | None = Header(default=None, alias="X-Household-ID"),
) -> Principal:
    if household_id is None or HOUSEHOLD_ID_PATTERN.fullmatch(household_id) is None:
        raise HTTPException(status_code=403)
    try:
        member_ref = (
            get_firestore()
            .collection("households")
            .document(household_id)
            .collection("members")
            .document(uid)
        )
        membership = member_ref.get()
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Household access could not be verified.", 503, True) from exc
    data = membership.to_dict() if membership.exists else None
    if not data or data.get("status") != "ACTIVE" or data.get("uid") != uid:
        raise HTTPException(status_code=403)
    role = data.get("role")
    if role not in {"OWNER", "MEMBER"}:
        raise HTTPException(status_code=403)
    return Principal(uid=uid, household_id=household_id, role=role)


async def current_actor(
    uid: str = Depends(authenticated_uid),
    actor_kind: str | None = Header(default=None, alias="X-Actor-Kind"),
    actor_id: str | None = Header(default=None, alias="X-Actor-Id"),
) -> ActorContext:
    """Resolve a requested actor against current server-owned membership facts."""
    if actor_kind not in {"household", "business", "recipient_org"} or not actor_id:
        raise HTTPException(status_code=403)
    if ACTOR_ID_PATTERN.fullmatch(actor_id) is None:
        raise HTTPException(status_code=403)
    db = get_firestore()
    try:
        if actor_kind == "household":
            member_ref = db.collection("households").document(actor_id).collection("members").document(uid)
            snapshot = member_ref.get()
            data = snapshot.to_dict() if snapshot.exists else None
            if not data or data.get("uid") != uid or data.get("status") != "ACTIVE":
                raise HTTPException(status_code=403)
            role = data.get("role")
            if role not in {"OWNER", "MEMBER"}:
                raise HTTPException(status_code=403)
            version = data.get("version", 1)
            if isinstance(version, bool) or not isinstance(version, int) or version < 1:
                raise DomainError("DATA_UNAVAILABLE", "Household membership data is invalid.", 503, True)
            return ActorContext(
                uid=uid,
                actor_kind="household",
                actor_id=actor_id,
                role=role,
                permissions=("offer:create", "offer:edit", "offer:read", "offer:publish"),
                membership_version=version,
            )

        org_snapshot = db.collection("organizations").document(actor_id).get()
        organization = org_snapshot.to_dict() if org_snapshot.exists else None
        expected_type = "business_donor" if actor_kind == "business" else "recipient_org"
        if not organization or organization.get("org_id") != actor_id or organization.get("type") != expected_type:
            raise HTTPException(status_code=403)
        member_snapshot = db.collection("organization_members").document(organization_membership_document_id(actor_id, uid)).get()
        membership = member_snapshot.to_dict() if member_snapshot.exists else None
        if not membership or membership.get("org_id") != actor_id or membership.get("uid") != uid or membership.get("status") != "ACTIVE":
            raise HTTPException(status_code=403)
        role = membership.get("role")
        version = membership.get("version")
        permissions = membership.get("permissions")
        if (
            not isinstance(role, str)
            or isinstance(version, bool)
            or not isinstance(version, int)
            or version < 1
            or not isinstance(permissions, list)
            or any(not isinstance(permission, str) for permission in permissions)
        ):
            raise DomainError("DATA_UNAVAILABLE", "Organization membership data is invalid.", 503, True)
        status = organization.get("verification_status")
        if actor_kind == "recipient_org":
            # Recipient access is tied to a complete self-reported profile and active
            # membership. Approval remains a separate verification fact and is not
            # inferred from profile completion.
            from app.domain.recipient_access import RECIPIENT_OPERATOR_PERMISSIONS, validate_recipient_membership

            validate_recipient_membership(organization, membership, uid, actor_id, version)
            permissions = list(RECIPIENT_OPERATOR_PERMISSIONS)
        return ActorContext(
            uid=uid,
            actor_kind=actor_kind,
            actor_id=actor_id,
            role=role,
            permissions=tuple(permissions),
            membership_version=version,
            organization_status=status if isinstance(status, str) else None,
        )
    except (HTTPException, DomainError):
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "Actor membership could not be verified.", 503, True) from exc
