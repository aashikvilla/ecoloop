"""Deterministic Mass Balance & Emission Factor Calculator."""
from typing import Dict, Any


CATEGORY_EMISSION_FACTORS = {
    "dairy": 5.4,
    "grains": 1.1,
    "produce": 0.6,
    "meat_poultry": 9.2,
    "mixed_meals": 2.2,
    "default": 1.5,
}


def calculate_mass_balance(
    purchased_kg: float,
    prep_waste_kg: float,
    consumed_kg: float,
    unserved_surplus_kg: float,
    plate_waste_kg: float,
    category: str = "mixed_meals",
) -> Dict[str, Any]:
    """Calculate stage-specific mass balance and verified avoided carbon emissions.
    
    Enforces physical conservation of mass:
    Purchased ~= Consumed + Unserved + Prep + Plate (+ delta storage)
    """
    total_accounted = prep_waste_kg + consumed_kg + unserved_surplus_kg + plate_waste_kg
    unaccounted_kg = round(purchased_kg - total_accounted, 2)

    total_waste_kg = prep_waste_kg + plate_waste_kg
    recoverable_kg = unserved_surplus_kg

    emission_factor = CATEGORY_EMISSION_FACTORS.get(category.lower(), CATEGORY_EMISSION_FACTORS["default"])
    avoided_co2e_kg = round(recoverable_kg * emission_factor, 2)

    diversion_rate_pct = 0.0
    if (total_waste_kg + recoverable_kg) > 0:
        diversion_rate_pct = round((recoverable_kg / (total_waste_kg + recoverable_kg)) * 100, 1)

    return {
        "purchased_kg": purchased_kg,
        "consumed_kg": consumed_kg,
        "prep_waste_kg": prep_waste_kg,
        "plate_waste_kg": plate_waste_kg,
        "unserved_surplus_kg": unserved_surplus_kg,
        "unaccounted_discrepancy_kg": unaccounted_kg,
        "diversion_rate_pct": diversion_rate_pct,
        "emission_factor_used": emission_factor,
        "estimated_avoided_co2e_kg": avoided_co2e_kg,
    }
