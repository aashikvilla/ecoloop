# Agent-Driven Development (ADD) & Knowledge Harness

> **Scope**: Developer-agent workflows, code generation standards, eval-driven development.  
> **Guiding Principle**: Build minimal, high-leverage test harnesses so autonomous agents can self-verify, iterate, and persist learnings without ballooning context tokens.

---

## 1. The Agent-Driven Development (ADD) Workflow

1. **Spec & Assertion First**:
   - Before prompting an agent to generate complex implementation code, define the schema contract and write the test assertion (e.g. gold case fixture in `gold_cases.json`).
   - The test provides unambiguous ground truth for the agent to self-evaluate.

2. **Autonomous Verification Loop**:
   ```text
   [Read Spec / Schema] 
           │
           ▼
   [Write Minimal Code] 
           │
           ▼
   [Run Verification Test / Linter]
           │
       ┌───┴───┐
     Fails   Passes
       │       │
       ▼       ▼
   [Refactor] [Commit & Document]
   ```

3. **Minimal Harness Principle**:
   - Avoid creating sprawling test mocks or heavy end-to-end setups when pure unit functions or schema validators can verify behavior in <500ms.
   - Fast feedback loops enable rapid agent convergence.

---

## 2. Living Knowledge Items (KIs)

1. **When to Create or Update a KI**:
   - When discovering a non-obvious repository quirk, SDK breaking change, or GCP quota/permission pattern.
   - When solving a subtle bug that future coding agents might reintroduce.

2. **Structure of a KI**:
   - Keep KIs focused: Problem statement, Root cause, Verified solution with minimal diff, and Reference links.
   - Store in documentation or `.agents/skills/*/references/`.

---

## 3. Codex & LLM Prompting Compatibility

1. **Context Density**:
   - Place highest-priority instructions at the very beginning and very end of prompts.
   - Avoid bloated files: modularize code into files under 200 lines so they easily fit into agent context windows.

2. **Explicit Type Signatures**:
   - Provide complete type signatures for all dependencies. LLMs generate 80% fewer hallucinations when type hints and interfaces are explicitly imported.

3. **Zero-Ambiguity Tool Schemas**:
   - Every tool parameter must have a clear `description` explaining units, constraints, and valid ranges.
