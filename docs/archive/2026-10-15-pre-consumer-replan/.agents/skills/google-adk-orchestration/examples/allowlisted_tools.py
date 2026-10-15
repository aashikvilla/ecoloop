"""Allowlisted Deterministic Tools for EcoLoop Agent."""
from typing import Dict, Any, List
from datetime import datetime, time


def scale_meal_portions(
    recipe_name: str,
    original_servings: int,
    target_servings: int,
    ingredients: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Deterministically recalculate ingredient quantities when headcount changes."""
    if target_servings <= 0:
        return {"error": "Target servings must be at least 1."}
    
    ratio = target_servings / original_servings
    scaled = []
    total_grams_saved = 0.0

    for item in ingredients:
        qty = float(item.get("quantity", 0))
        unit = item.get("unit", "g")
        new_qty = round(qty * ratio, 2)
        if ratio < 1.0 and unit in ["g", "grams"]:
            total_grams_saved += (qty - new_qty)

        scaled.append({
            "name": item.get("name"),
            "original_quantity": qty,
            "scaled_quantity": new_qty,
            "unit": unit,
        })

    return {
        "recipe_name": recipe_name,
        "original_servings": original_servings,
        "target_servings": target_servings,
        "scaling_factor": ratio,
        "ingredients": scaled,
        "estimated_grams_saved": round(total_grams_saved, 1),
    }


def check_cooking_cutoff(
    scheduled_meal_time: str,
    cutoff_minutes_before: int = 45,
    current_time_override: str = None,
) -> Dict[str, Any]:
    """Verify if a headcount change arrived before or after the cooking cutoff.
    
    Args:
        scheduled_meal_time: HH:MM format (24-hour) e.g., '19:30'.
        cutoff_minutes_before: Minutes before meal time when batch prep starts.
        current_time_override: Optional HH:MM for deterministic test cases.
    """
    fmt = "%H:%M"
    meal_t = datetime.strptime(scheduled_meal_time, fmt)
    now_t = datetime.strptime(current_time_override, fmt) if current_time_override else datetime.now()

    # Calculate difference in minutes
    diff_minutes = (meal_t.hour * 60 + meal_t.minute) - (now_t.hour * 60 + now_t.minute)
    is_before_cutoff = diff_minutes >= cutoff_minutes_before

    return {
        "scheduled_meal_time": scheduled_meal_time,
        "cutoff_minutes_before": cutoff_minutes_before,
        "minutes_remaining": diff_minutes,
        "is_before_cutoff": is_before_cutoff,
        "action_recommendation": "SCALE_BATCH" if is_before_cutoff else "DIVERT_PREPARED_SURPLUS",
    }


def draft_mock_cart(
    items_needed: List[Dict[str, Any]],
    current_inventory: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Reconcile needed ingredients with pantry stock and generate a simulated cart."""
    pantry_map = {p["name"].lower().strip(): float(p.get("quantity", 0)) for p in current_inventory}
    cart_items = []
    avoided_purchases = []

    for needed in items_needed:
        name = needed.get("name", "").lower().strip()
        required_qty = float(needed.get("quantity", 1))
        unit = needed.get("unit", "pack")
        in_stock = pantry_map.get(name, 0.0)

        if in_stock >= required_qty:
            avoided_purchases.append({
                "item": needed.get("name"),
                "reason": f"Already in stock ({in_stock} {unit})",
            })
        else:
            to_buy = required_qty - in_stock
            cart_items.append({
                "item": needed.get("name"),
                "quantity": to_buy,
                "unit": unit,
                "estimated_inr": round(to_buy * float(needed.get("unit_price_inr", 50)), 2),
            })

    return {
        "simulated": True,
        "merchant": "Swiggy Instamart (SIMULATED MOCK)",
        "cart_items": cart_items,
        "avoided_purchases": avoided_purchases,
        "total_estimated_inr": sum(c["estimated_inr"] for c in cart_items),
    }


# Map of allowlisted functions
ALLOWLISTED_TOOLS = {
    "scale_meal_portions": scale_meal_portions,
    "check_cooking_cutoff": check_cooking_cutoff,
    "draft_mock_cart": draft_mock_cart,
}
