# EcoLoop API Endpoints Specification

This document details all required HTTP endpoints according to Section 10 of the Master Product Specification.

| Method | Endpoint | Description | Role Required | Safety Invariant |
|---|---|---|---|---|
| `GET` | `/health` | Service health, version, commit SHA | Public | Never expose secret credentials |
| `GET` | `/v1/demo/scenarios` | Static synthetic fixture scenarios | Public / Demo | Read-only synthetic data |
| `POST` | `/v1/intake/parse` | Extract candidate data from multimodal input | Authenticated | Stores candidate only; uncommitted |
| `POST` | `/v1/facts/confirm` | User confirms/edits candidate data into verified inventory | Tenant Member | Requires explicit user verification |
| `POST` | `/v1/meal-plans/change` | Post meal attendee adjustment / plan change | Household/Chef | Triggers decision recalculation |
| `POST` | `/v1/decisions/evaluate` | Generates 1–2 actionable proposals using tools | Tenant Member | Deterministic math; no auto-checkout |
| `POST` | `/v1/actions/preview` | Returns immutable proposal with cost/impact | Tenant Member | Must include `simulated: true` |
| `POST` | `/v1/actions/{id}/approve` | Authorized human executes/simulates action | Approver Role | Idempotent, checks expiry & permission |
| `POST` | `/v1/kitchens/batches` | Logs kitchen headcount, prep/unserved mass | Kitchen Chef | Stage-specific weighing |
| `POST` | `/v1/recovery/offers` | Submits surplus batch for NGO donation | Donor Role | Requires temperature/safety logs |
| `POST` | `/v1/recovery/offers/{id}/accept` | NGO / recipient confirms capacity and accepts | NGO Coordinator | Capacity check required before dispatch |
| `POST` | `/v1/outcomes/measured` | Logs physically measured kg saved/diverted | Authorized Actor | Must reference physical scale/receipt |
| `GET` | `/v1/evaluation/results` | Returns benchmark run comparative metrics | Admin/Auditor | Run-specific metrics only |
| `DELETE`| `/v1/users/me/context` | Wipes user state subject to retention rules | Authenticated | Soft-deletes user personal data |
