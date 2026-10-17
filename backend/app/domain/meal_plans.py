from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Annotated, Any, Literal

from firebase_admin import firestore
from pydantic import Field, StrictInt, model_validator

from app.core.errors import DomainError
from app.core.firestore import get_firestore
from app.core.identity import Principal
from app.domain.repository import (
    _assert_member_in_transaction,
    _idempotency_ref,
    _prior_result,
    _stored_version,
)
from app.schemas.household import IdempotencyKey, MealSuggestionCard, PortionAdjustmentCard, StrictModel


class MealProposalActionCommand(StrictModel):
    schema_version: Literal[1] = 1
    idempotency_key: IdempotencyKey
    base_version: Annotated[StrictInt, Field(ge=1)]
    action: Literal["APPROVE", "EDIT", "DISMISS"]
    preparation_stage: Literal["NOT_STARTED", "PARTLY_PREPARED", "ALREADY_COOKED", "UNKNOWN"]
    proposed_servings: Annotated[StrictInt, Field(ge=1, le=100)] | None = None
    plan_base_version: Annotated[StrictInt, Field(ge=1)] | None = None

    @model_validator(mode="after")
    def validate_action(self) -> "MealProposalActionCommand":
        if self.action == "EDIT" and self.proposed_servings is None:
            raise ValueError("EDIT requires proposed_servings")
        if self.action in {"APPROVE", "DISMISS"} and self.proposed_servings is not None:
            raise ValueError("proposed_servings is allowed only for EDIT")
        return self


# Unit labels remain unchanged during scaling. These are explicit measured units;
# arbitrary/model-provided unit strings remain visible but are not recalculated.
SCALABLE_UNITS = frozenset({"g", "kg", "mg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb"})
PREPARATION_GUIDANCE = {
    "NOT_STARTED": "MAKE_A_SMALLER_BATCH",
    "PARTLY_PREPARED": "CONSIDER_STORAGE_OR_SHARING",
    "ALREADY_COOKED": "PORTION_AND_CONSIDER_STORAGE_OR_SHARING",
    "UNKNOWN": "CONFIRM_PREPARATION_STAGE",
}


def _scale_eligible_ingredients(ingredients: list[dict[str, Any]], old: int, new: int) -> list[dict[str, Any]]:
    """Scale explicitly measured or assistant-estimated quantities, preserving the rest."""
    ratio = Decimal(new) / Decimal(old)
    scaled: list[dict[str, Any]] = []
    for source in ingredients:
        ingredient = dict(source)
        amount = ingredient.get("amount")
        unit = ingredient.get("unit")
        if (
            ingredient.get("quantity_basis") in {"MEASURED", "ASSISTANT_ESTIMATE"}
            and ingredient.get("uncertain") is not True
            and isinstance(amount, (int, float))
            and not isinstance(amount, bool)
            and unit in SCALABLE_UNITS
        ):
            try:
                value = Decimal(str(amount)) * ratio
            except (InvalidOperation, ValueError):
                scaled.append(ingredient)
                continue
            if value.is_finite() and value >= 0:
                ingredient["amount"] = float(value)
                ingredient["scaled_from_amount"] = amount
        scaled.append(ingredient)
    return scaled


def apply_meal_proposal_action(
    principal: Principal,
    proposal_id: str,
    command: MealProposalActionCommand,
) -> dict[str, Any]:
    db = get_firestore()
    household = db.collection("households").document(principal.household_id)
    receipt_ref = household.collection("assistant_proposals").document(proposal_id)
    idem_ref = _idempotency_ref(household, "meal-proposal", command.idempotency_key, principal.uid)
    payload = {"proposal_id": proposal_id, **command.model_dump(mode="json")}
    payload_hash = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    now = datetime.now(timezone.utc)

    @firestore.transactional
    def commit(transaction: Any) -> dict[str, Any]:
        _assert_member_in_transaction(transaction, db, principal)
        previous = _prior_result(idem_ref.get(transaction=transaction), payload_hash, principal.uid)
        if previous is not None:
            return previous

        receipt_snapshot = receipt_ref.get(transaction=transaction)
        receipt = receipt_snapshot.to_dict() if receipt_snapshot.exists else None
        if (
            not receipt
            or receipt.get("actor_uid") != principal.uid
            or receipt.get("household_id") != principal.household_id
        ):
            raise DomainError("NOT_FOUND", "This proposal is unavailable.", 404)
        if receipt.get("status") != "PENDING" or _stored_version(receipt, default=-1) != command.base_version:
            raise DomainError("VERSION_CONFLICT", "This proposal changed. Reload before taking action.", 409)
        expiry = receipt.get("expires_at")
        if not isinstance(expiry, datetime) or expiry.tzinfo is None or expiry <= now:
            raise DomainError("PROPOSAL_EXPIRED", "This proposal expired. Ask again for a current suggestion.", 409)

        card_data = receipt.get("card")
        if not isinstance(card_data, dict):
            raise DomainError("DATA_UNAVAILABLE", "The saved proposal is invalid.", 503, True)
        plan_ref = None
        plan: dict[str, Any] | None = None
        card: MealSuggestionCard | PortionAdjustmentCard
        approving = command.action in {"APPROVE", "EDIT"}
        if card_data.get("type") == "MealSuggestion":
            try:
                card = MealSuggestionCard.model_validate(card_data)
            except Exception as exc:
                raise DomainError("DATA_UNAVAILABLE", "The saved meal proposal is invalid.", 503, True) from exc
            if command.action not in card.allowed_actions:
                raise DomainError("INVALID_ACTION", "This meal proposal does not allow that action.", 422)
            if approving:
                servings = command.proposed_servings if command.action == "EDIT" else card.servings
                ingredients = [
                    {
                        **ingredient.model_dump(mode="json"),
                        # Keep model quantities labeled as estimates, never facts.
                        "quantity_basis": (
                            "ASSISTANT_ESTIMATE"
                            if ingredient.amount is not None
                            and not ingredient.uncertain
                            and ingredient.unit in SCALABLE_UNITS
                            else "UNKNOWN" if ingredient.amount is not None else None
                        ),
                    }
                    for ingredient in card.ingredients
                ]
                if command.action == "EDIT" and command.preparation_stage == "NOT_STARTED":
                    ingredients = _scale_eligible_ingredients(ingredients, card.servings, servings)
                plan_ref = household.collection("meal_plans").document(proposal_id)
                if plan_ref.get(transaction=transaction).exists:
                    raise DomainError("VERSION_CONFLICT", "This meal plan already exists.", 409)
                plan = {
                    "plan_id": proposal_id,
                    "household_id": principal.household_id,
                    "title": card.title,
                    "servings": servings,
                    "preparation_stage": command.preparation_stage,
                    "ingredients": ingredients,
                    "version": 1,
                    "approved_by": principal.uid,
                    "created_by": principal.uid,
                    "created_at": now,
                    "updated_at": now,
                    "source_proposal_id": proposal_id,
                }
        else:
            try:
                card = PortionAdjustmentCard.model_validate(card_data)
            except Exception as exc:
                raise DomainError("DATA_UNAVAILABLE", "The saved portion proposal is invalid.", 503, True) from exc
            if command.action not in card.allowed_actions:
                raise DomainError("INVALID_ACTION", "This portion proposal does not allow that action.", 422)
            if approving:
                # The only supported linkage is a server-provided source ref that
                # resolves to a household plan; client-supplied plan IDs are ignored.
                if len(card.source_refs) != 1:
                    raise DomainError("INVALID_ACTION", "This portion proposal is missing its meal plan reference.", 422)
                plan_ref = household.collection("meal_plans").document(card.source_refs[0])
                plan_snapshot = plan_ref.get(transaction=transaction)
                plan = plan_snapshot.to_dict() if plan_snapshot.exists else None
                if not plan or plan.get("household_id") != principal.household_id:
                    raise DomainError("NOT_FOUND", "The meal plan is unavailable.", 404)
                current_version = _stored_version(plan, default=-1)
                if current_version != card.base_version or current_version != command.plan_base_version:
                    raise DomainError("VERSION_CONFLICT", "The meal plan changed. Reload it before approving this adjustment.", 409)
                old_servings = plan.get("servings")
                ingredients = plan.get("ingredients")
                if (
                    isinstance(old_servings, bool)
                    or not isinstance(old_servings, int)
                    or old_servings < 1
                    or old_servings > 100
                    or old_servings != card.original_servings
                    or not isinstance(ingredients, list)
                    or any(not isinstance(entry, dict) for entry in ingredients)
                ):
                    raise DomainError("VERSION_CONFLICT", "The meal plan no longer matches this adjustment.", 409)
                new_servings = command.proposed_servings or card.proposed_servings
                plan = {
                    **plan,
                    "servings": new_servings,
                    "preparation_stage": command.preparation_stage,
                    "ingredients": (
                        _scale_eligible_ingredients(ingredients, old_servings, new_servings)
                        if command.preparation_stage == "NOT_STARTED"
                        else ingredients
                    ),
                    "version": current_version + 1,
                    "approved_by": principal.uid,
                    "updated_at": now,
                }

        status = "APPROVED" if approving else "DISMISSED"
        result: dict[str, Any] = {
            "proposal_id": proposal_id,
            "status": status,
            "version": command.base_version + 1,
            "action": command.action,
        }
        if approving and plan_ref is not None and plan is not None:
            if card_data.get("type") == "MealSuggestion":
                transaction.create(plan_ref, plan)
            else:
                transaction.update(plan_ref, plan)
            result.update({
                "plan_id": plan_ref.id,
                "plan_version": plan["version"],
                "servings": plan["servings"],
                "preparation_guidance": PREPARATION_GUIDANCE[command.preparation_stage],
                "stock_changed": False,
            })
        transaction.update(receipt_ref, {
            "status": status,
            "version": command.base_version + 1,
            "resolved_at": now,
            "resolved_by": principal.uid,
        })
        turn_id = receipt.get("turn_id")
        if not isinstance(turn_id, str) or not turn_id:
            raise DomainError("DATA_UNAVAILABLE", "The proposal turn reference is invalid.", 503, True)
        transaction.update(
            household.collection("assistant_users").document(principal.uid)
            .collection("turns").document(turn_id),
            {f"resolutions.{proposal_id}": result},
        )
        transaction.create(idem_ref, {
            "actor_uid": principal.uid,
            "payload_hash": payload_hash,
            "result": result,
            "created_at": now,
        })
        return result

    try:
        return commit(db.transaction())
    except DomainError:
        raise
    except Exception as exc:
        raise DomainError("DATA_UNAVAILABLE", "The meal proposal could not be confirmed.", 503, True) from exc
