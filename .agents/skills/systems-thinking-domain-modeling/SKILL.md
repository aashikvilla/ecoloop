---
name: systems-thinking-domain-modeling
description: >-
  Model circular resource flows, conservation of mass balance, stocks and flows, and verified
  greenhouse gas (GHG) emission factors. Use when implementing mass balance calculations,
  waste diversion metrics, or designing feedback-aware circular decision models in EcoLoop.
---

# Systems Thinking & Circular Resource Domain Modeling Skill

This skill guides the formal domain modeling of circular economy resource streams, enforcing physical mass balance and distinguishing measured physical outcomes from statistical estimates.

## Core Concepts
1. **Conservation of Mass**:
   $$\text{Mass}_{\text{input}} = \text{Mass}_{\text{consumed}} + \text{Mass}_{\text{diverted\_surplus}} + \text{Mass}_{\text{organic\_compost}} + \text{Mass}_{\text{discarded\_residual}}$$
2. **Stock-and-Flow Dynamics**:
   - Inventory is a *stock* depleted by consumption *flows* and spoilage *flows*.
   - Decision tools act as *valves* regulating the flows before materials cross irreversible boundaries.
3. **Verified Emission Factors vs. Claims**:
   - Only multiply kg by emission factors ($E_f$) when the disposal counterfactual and commodity category are explicitly known.

---

## 1. Directory Structure

```text
backend/app/services/domain/
├── __init__.py
├── mass_balance.py       # Deterministic mass balance solver
├── emission_factors.py   # IPCC & EPA WARM emission factors
└── feedback_loops.py     # System dynamics state evaluator
```

---

## 2. Emission Factor Methodology

Avoid universal multipliers like "every kg saved = 2.5 kg CO2e". Use category-specific factors:

| Category | Typical Food Loss Factor ($\text{kg CO}_2\text{e} / \text{kg}$) | Landfill Methane Avoidance Factor |
|---|:---:|:---:|
| **Dairy / Cheese** | 4.8 – 8.2 | 0.95 |
| **Grains / Bread** | 0.8 – 1.4 | 1.10 |
| **Produce / Vegetables** | 0.4 – 0.9 | 0.45 |
| **Cooked Mixed Meals** | 1.8 – 2.6 | 0.85 |

---

## 3. References & Examples
- [Circular Economy Mass Balance Specification](./references/circular_economy_mass_balance.md)
- [Feedback Loops, Stocks and Flows](./references/feedback_loops_stocks_flows.md)
- [Mass Balance Calculator Implementation](./examples/mass_balance_calculator.py)
