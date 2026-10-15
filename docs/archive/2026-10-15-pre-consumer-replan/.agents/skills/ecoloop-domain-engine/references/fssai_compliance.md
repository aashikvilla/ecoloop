# FSSAI Surplus Food Recovery Regulations

This document summarizes the regulatory compliance requirements based on the Food Safety and Standards Authority of India (FSSAI) *Food Safety and Standards (Recovery & Distribution of Surplus Food) Regulations, 2019*.

## 1. Key Definitions & Prohibitions
- **Surplus Food**: Unserved, unused, or packaged edible food that has not been served to diners and remains within safe shelf life.
- **Prohibition on Plate Waste**: Food returned from consumer plates, opened buffet servings that have been exposed without temperature control, or expired items **MUST NOT** be distributed.
- **Qualified Food Business Operator (FBO)**: Donors must maintain food hygiene registration and records.

## 2. Temperature & Time Limits
- **Hot Cooked Food**: Maintained at $\ge 65^\circ\text{C}$ and consumed within 4 hours of preparation.
- **Chilled Food**: Kept at $\le 5^\circ\text{C}$ throughout transport and distribution.
- **Frozen Food**: Kept at $\le -18^\circ\text{C}$.

## 3. Mandatory Digital Checklist for Offers
Before an offer can be approved in EcoLoop:
1. `is_unserved`: Must be True.
2. `cooking_time`: Must be logged.
3. `temperature_celsius`: Must be recorded with a physical thermometer.
4. `human_verifier_name`: Qualified staff name must be attached.
5. `recipient_capacity_confirmed`: NGO coordinator must confirm cold-chain van and destination acceptance.
