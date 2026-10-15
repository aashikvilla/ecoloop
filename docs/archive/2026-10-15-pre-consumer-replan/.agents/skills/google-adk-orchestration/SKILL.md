---
name: google-adk-orchestration
description: >-
  Design, build, and evaluate tool-calling agents and orchestrators using the Google Agent Development Kit (ADK)
  and Python. Use when implementing agent workflows, tool definitions, human-in-the-loop approval gates,
  session management, or trajectory tracing in EcoLoop.
---

# Google Agent Development Kit (ADK) Orchestration Skill

This skill guides the construction of safe, deterministic, tool-augmented decision copilots using Google's Agent Development Kit (ADK) principles within a FastAPI backend.

## Architecture Philosophy (ADR-004 & ADR-005)
1. **Single Orchestrator First**: Avoid multi-agent cascades where one agent hallucinates inputs for another. A single, well-bounded orchestrator handles intake and tool selection.
2. **Deterministic Computation**: Language models reason over messy, ambiguous inputs and select tool intents. Python code executes all mathematical operations, portion calculations, cooking batch deadlines, and FSSAI eligibility checks.
3. **Never Self-Authorizing**: Tool calls never directly invoke external financial, procurement, or donation APIs. They emit immutable `ActionProposal` drafts (`simulated: true` in demo) that require explicit human approval.

---

## 1. Directory Structure

```text
backend/app/services/agent/
├── orchestrator.py        # Main ADK orchestrator loop
├── tools/                 # Allowlisted deterministic Python tools
│   ├── __init__.py
│   ├── inventory_tools.py # Reconcile pantry stock
│   ├── portion_tools.py   # Calculate exact ingredient scaling
│   ├── cutoff_tools.py    # Verify cooking batch cutoff time
│   └── mock_cart_tools.py # Draft simulated quick-commerce carts
├── session.py             # Firestore-backed session state
└── tracing.py             # AgentTrace logging (tokens, latency, tools)
```

---

## 2. Defining Allowlisted Tools

Tools must be pure Python functions with complete type annotations and docstrings that Gemini inspects for tool calling:

```python
from typing import Dict, Any, List

def calculate_recipe_portions(
    original_servings: int,
    target_servings: int,
    ingredients: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Deterministically scale recipe ingredients for an updated headcount.
    
    Args:
        original_servings: Baseline headcount for the recipe.
        target_servings: Updated headcount of diners actually eating.
        ingredients: List of dicts with 'name', 'quantity', 'unit'.
    """
    if target_servings <= 0:
        raise ValueError("Target servings must be positive.")
    
    ratio = target_servings / original_servings
    scaled = []
    for ing in ingredients:
        scaled.append({
            "name": ing["name"],
            "original_quantity": ing["quantity"],
            "scaled_quantity": round(ing["quantity"] * ratio, 2),
            "unit": ing["unit"],
        })
    
    return {
        "scaling_ratio": ratio,
        "scaled_ingredients": scaled,
        "portion_savings_pct": round((1.0 - ratio) * 100, 1) if ratio < 1.0 else 0.0,
    }
```

---

## 3. Human-In-The-Loop (HIL) Action Lifecycle

```text
[Gemini Tool Call] 
       │
       ▼
[Draft ActionProposal] ──> Status: PENDING_APPROVAL, simulated: true
       │
       ▼
[Frontend UI Review] ──> User inspects itemized impact & cost
       │
   ┌───┴───┐
Approve  Reject
   │       │
   ▼       ▼
[Execute] [Cancelled]
```

---

## 4. References & Examples
- [ADK Concepts & Sessions](./references/adk_concepts.md)
- [Human-In-The-Loop Approval Gates](./references/human_in_the_loop.md)
- [Complete Orchestrator Example](./examples/orchestrator_example.py)
- [Allowlisted Tools Implementation](./examples/allowlisted_tools.py)
