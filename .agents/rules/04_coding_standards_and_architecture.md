# Coding Standards, Function Design & Systems Thinking

> **Scope**: Monorepo-wide (Python backend, TypeScript frontend, agent prompts).  
> **Guiding Principle**: Write clean, resilient, intention-revealing code with clear boundaries, treating both code and domain assets through a systems-thinking lens.

---

## 1. Systems Thinking Principles for Software & Domain

In EcoLoop, code is not isolated; it interacts with physical resource loops (stocks, flows, feedback delays).

1. **Stocks and Flows Awareness**:
   - **Stocks** are accumulations (e.g. food in pantry, unserved batch mass in kitchen, kilograms in cold storage).
   - **Flows** are transition rates (e.g. grocery consumption rate, cooking conversion rate, surplus diversion rate).
   - In code: State changes must preserve conservation of mass. What leaves pantry stock must either be logged as consumed, scaled down, or directed to recovery/waste.

2. **Feedback Delays & Tipping Points**:
   - Cooking batch cutoffs are temporal tipping points: once cooking begins, raw ingredients become committed meal stocks.
   - Information delays: The later the attendance change message arrives, the less avoidable the waste. Code must explicitly measure and minimize this information delay.

3. **Second-Order Effects**:
   - Avoid creating per-meal donation quotas that inadvertently incentivize kitchens to over-prepare in order to donate.
   - Always differentiate between preventing preparation waste (highest priority) and managing surplus recovery (secondary).

---

## 2. Function Design & Complexity Constraints

1. **Function Length**:
   - Ideal: **15 to 30 lines** per function.
   - Hard Ceiling: **50 lines** max. If a function exceeds 50 lines, it must be decomposed into focused subroutines or helper methods.

2. **Single Responsibility Principle (SRP)**:
   - A function must do one thing well.
   - Separate **extraction** (e.g. Gemini JSON parse) from **validation** (e.g. FSSAI check) and **persistence** (e.g. Firestore write).

3. **Cyclomatic Complexity**:
   - Keep cyclomatic complexity under **8**.
   - Avoid deeply nested conditionals (`> 3 levels`). Use guard clauses, early returns, and pattern matching (`match/case` in Python).

---

## 3. Naming Conventions

### Python (Backend)
- **Functions & Variables**: `snake_case`, verb-noun phrases (`calculate_scaled_portions()`, `reconcile_pantry_stock()`).
- **Classes**: `PascalCase`, nouns (`BatchCutoffEvaluator`, `ActionProposalDraft`).
- **Constants**: `UPPER_SNAKE_CASE` (`DEFAULT_CUTOFF_MINUTES_BEFORE_SERVICE`).
- **Booleans**: Prefix with `is_`, `has_`, `should_`, or `can_` (`is_before_cutoff`, `has_temperature_log`).

### TypeScript / Next.js (Frontend)
- **Components**: `PascalCase` matching filename (`DecisionProposalCard.tsx`).
- **Hooks**: `camelCase` starting with `use` (`useLiveBackendHealth.ts`).
- **Utilities & Functions**: `camelCase` (`formatCarbonMetric()`, `parseReceiptPreview()`).
- **Types & Interfaces**: `PascalCase` with descriptive nouns (`EcoItem`, `MealPlanChangePayload`).

---

## 4. Error Handling & Resilience

1. **Explicit Error Types**: Never catch generic `Exception` or `any` without re-raising or wrapping in domain exceptions (`PantryItemNotFoundError`, `CutoffExpiredError`).
2. **Deterministic Fallbacks**: If external API calls (e.g. Vertex AI or quick-commerce simulation) time out, gracefully degrade to fallback offline rules with visible UI indicators.
3. **Audit Trail**: Every error in a mutating operation must log structured context: tenant ID, actor, timestamp, input payload summary.
