"""Explicit-preference synchronization with Agent Platform Memory Bank.

Firestore remains canonical. This adapter only accepts one already-persisted,
owner-consented preference and never receives an ADK session or conversation.
It is disabled unless explicitly enabled in the process environment.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import Any

from app.core.config import settings
from app.domain.preferences import (
    claim_preference_memory_sync,
    finish_preference_memory_sync,
    get_preference_record,
    list_preferences,
    mark_preference_memory_sync_not_configured,
    read_current_preference_for_memory_sync,
)


_ENGINE_ID = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
_PROJECT_ID = re.compile(r"^[a-z][a-z0-9-]{4,61}[a-z0-9]$")
_LOCATION = re.compile(r"^[a-z0-9-]{1,63}$")


@dataclass(frozen=True)
class MemoryBankConfig:
    project_id: str
    location: str
    reasoning_engine_id: str


def _config() -> MemoryBankConfig | None:
    """Use validated app settings; disabled by default and never probes Google."""
    if not settings.AGENT_MEMORY_BANK_ENABLED:
        return None

    project_id = (
        settings.AGENT_VERTEX_PROJECT_ID
        or settings.FIREBASE_PROJECT_ID
        or settings.GOOGLE_CLOUD_PROJECT
        or ""
    ).strip()
    location = settings.AGENT_VERTEX_LOCATION.strip()
    engine_id = (settings.AGENT_VERTEX_ENGINE_ID or "").strip()
    if (
        not _PROJECT_ID.fullmatch(project_id)
        or not _LOCATION.fullmatch(location)
        or not _ENGINE_ID.fullmatch(engine_id)
    ):
        return None
    return MemoryBankConfig(project_id, location, engine_id)


def _sdk_client(config: MemoryBankConfig) -> Any | None:
    try:
        import agentplatform
    except ImportError:
        return None
    return agentplatform.Client(project=config.project_id, location=config.location)


def memory_bank_status() -> dict[str, str]:
    """Return configuration state without constructing a client or probing Google."""
    config = _config()
    if config is None:
        status = "unavailable" if settings.AGENT_MEMORY_BANK_ENABLED else "not_configured"
        return {"status": status, "provider": "google_agent_platform"}
    return {"status": "configured_unverified", "provider": "google_agent_platform"}


def _memory_resource(config: MemoryBankConfig, uid: str, preference_id: str) -> tuple[str, str, str]:
    owner_scope = hashlib.sha256(uid.encode("utf-8")).hexdigest()
    memory_id = "p-" + hashlib.sha256(f"{owner_scope}:{preference_id}".encode("utf-8")).hexdigest()[:52]
    engine_name = (
        f"projects/{config.project_id}/locations/{config.location}/"
        f"reasoningEngines/{config.reasoning_engine_id}"
    )
    return engine_name, f"{engine_name}/memories/{memory_id}", owner_scope


def _is_not_found(error: Exception) -> bool:
    code = getattr(error, "code", None)
    if callable(code):
        try:
            code = code()
        except Exception:
            code = None
    response = getattr(error, "response", None)
    status_code = getattr(response, "status_code", None) or getattr(error, "status_code", None)
    return code in {404, "404", "NOT_FOUND"} or status_code == 404


def sync_approved_preference(uid: str, preference_id: str) -> str:
    """Reconcile one canonical preference; return a truthful sync state.

    Active preferences are written as direct facts with a deterministic ID.
    A correction deletes that exact ID before creating the new version. A
    revoked preference only deletes. In particular, this never calls ADK's
    session/event ingestion methods.
    """
    config = _config()
    if config is None:
        return mark_preference_memory_sync_not_configured(uid, preference_id)

    claim = claim_preference_memory_sync(uid, preference_id)
    if claim["status"] in {"synced", "busy"}:
        return "synced" if claim["status"] == "synced" else "pending"
    record = claim["record"]
    state = record["status"]
    text = record["text"]
    version = record["version"]
    token = claim["token"]

    try:
        client = _sdk_client(config)
        if client is None:
            raise RuntimeError("Agent Platform SDK is unavailable")
        engine_name, memory_name, owner_scope = _memory_resource(config, uid, preference_id)
        memories = client.memory_banks.memories

        # Re-read Firestore before each provider mutation. Lease checks prevent
        # overlapping workers; version checks make stale workers stop.
        current = read_current_preference_for_memory_sync(uid, preference_id, version, token)
        if current is None:
            return "pending"
        try:
            memories.get(name=memory_name)
            exists = True
        except Exception as error:
            if not _is_not_found(error):
                raise
            exists = False

        if exists:
            current = read_current_preference_for_memory_sync(uid, preference_id, version, token)
            if current is None:
                return "pending"
            memories.delete(name=memory_name, config={"wait_for_completion": True})

        if state == "ACTIVE":
            current = read_current_preference_for_memory_sync(uid, preference_id, version, token)
            if current is None or current["status"] != "ACTIVE" or current["consent"] is not True:
                return "pending"
            memories.create(
                name=engine_name,
                fact=f"User-approved preference: {current['text'].strip()}",
                scope={"app_name": "ecoloop", "user_id": owner_scope},
                config={"memory_id": memory_name.rsplit("/", 1)[-1], "wait_for_completion": True},
            )
        if finish_preference_memory_sync(uid, preference_id, version, token, "synced"):
            return "synced"
        return "pending"
    except Exception:
        # The canonical Firestore write is already committed. Tell the caller
        # that managed memory needs retry/reconciliation; never claim success.
        try:
            finish_preference_memory_sync(uid, preference_id, version, token, "reconciliation_required")
        except Exception:
            pass
        return "reconciliation_required"


def retrieve_approved_preferences(uid: str, *, limit: int = 20) -> list[dict[str, Any]]:
    """Bounded retrieval that returns only current Firestore-approved facts.

    A static provider query is used so raw assistant/user text is never sent to
    Memory Bank. Provider results are treated only as candidate IDs; each result
    is re-read from Firestore and must match the exact deterministic resource,
    owner scope, current version, active consent, and canonical fact.
    """
    config = _config()
    if config is None:
        return []
    bounded_limit = max(1, min(limit, 20))
    canonical = [
        item for item in list_preferences(uid)
        if item["status"] == "ACTIVE"
        and item["consent"] is True
        and item["memory_bank_sync"]["status"] == "synced"
        and item["memory_bank_sync"]["version"] == item["version"]
    ][:bounded_limit]
    if not canonical:
        return []

    owner_scope = hashlib.sha256(uid.encode("utf-8")).hexdigest()
    try:
        client = _sdk_client(config)
        if client is None:
            return []
        engine_name = (
            f"projects/{config.project_id}/locations/{config.location}/"
            f"reasoningEngines/{config.reasoning_engine_id}"
        )
        candidates = client.memory_banks.memories.retrieve(
            name=engine_name,
            scope={"app_name": "ecoloop", "user_id": owner_scope},
            similarity_search_params={"search_query": "user-approved household preference", "top_k": bounded_limit},
        )
        by_name = {
            _memory_resource(config, uid, item["preference_id"])[1]: item
            for item in canonical
        }
        matched: list[dict[str, Any]] = []
        for candidate in candidates:
            memory = getattr(candidate, "memory", None)
            name = getattr(memory, "name", None)
            expected = by_name.get(name)
            if expected is None or getattr(memory, "scope", None) != {"app_name": "ecoloop", "user_id": owner_scope}:
                continue
            if getattr(memory, "fact", None) != f"User-approved preference: {expected['text'].strip()}":
                continue
            current = get_preference_record(uid, expected["preference_id"])
            if (
                current is not None
                and current["status"] == "ACTIVE"
                and current["consent"] is True
                and current["version"] == expected["version"]
                and current["text"] == expected["text"]
                and current["memory_bank_sync"]["status"] == "synced"
                and current["memory_bank_sync"]["version"] == current["version"]
            ):
                matched.append(current)
            if len(matched) >= bounded_limit:
                break
        return matched
    except Exception:
        return []
