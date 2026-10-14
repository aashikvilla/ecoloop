# Human-In-The-Loop (HIL) Approval Lifecycle

To guarantee safety and prevent unintended real-world operations, EcoLoop enforces a formal 4-phase approval cycle:

## 1. Action Proposal Creation
When a tool (such as `draft_mock_quick_commerce_cart` or `schedule_surplus_pickup`) generates an external action:
- It creates an `ActionProposal` record in Firestore.
- Fields:
  - `proposal_id`: Unique hash/UUID
  - `tenant_id`: Scoped tenant
  - `action_type`: e.g., `MOCK_CART_CHECKOUT`, `DONATION_PICKUP`
  - `payload`: Exact items, quantities, estimated cost, recipient
  - `simulated`: Boolean (always `True` for P0)
  - `status`: `PENDING_APPROVAL`
  - `expires_at`: ISO timestamp (e.g. 15 minutes from creation)

## 2. Immutable Preview
The frontend fetches the proposal:
- The user reviews the exact differences (e.g., items already in stock are removed, avoiding duplicate purchases).
- The user sees clear badges: `[SIMULATED DEMO ACTION]`.

## 3. Explicit Approval / Rejection
- Endpoint: `POST /v1/actions/{proposal_id}/approve`
- Requires authorized role.
- Checks `expires_at > now()`.
- Idempotent: If already approved, returns existing execution record.

## 4. Outcome Recording
After approval, an `OutcomeRecord` is generated with physical metrics or simulated indicators, distinguishing measured mass from estimates.
