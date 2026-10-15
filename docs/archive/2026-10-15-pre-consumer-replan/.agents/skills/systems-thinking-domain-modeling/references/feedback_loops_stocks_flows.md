# Feedback Loops, Stocks and Flows in EcoLoop

## System Dynamics Overview

```text
[Household / Kitchen Planning] 
         │  ▲ (Balancing Loop B1: Verified Inventory Feedback)
         ▼  │
   [Food Purchases] ──> [Pantry / Storage Stock]
                              │  ▲ (Balancing Loop B2: Timely Headcount Cutoff)
                              ▼  │
                    [Committed Cooking Batch]
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
          [Consumed Meals]     [Unserved Surplus]
                                        │ (Flow)
                                        ▼
                            [NGO Recovery / Composting]
```

### Balancing Loop B1: Pantry Reconciliation
- When users register grocery receipts, pantry inventory stock rises.
- When planning future meals, existing items are deducted from shopping requirements, dampening over-purchasing.

### Balancing Loop B2: Cooking Cutoff Enforcement
- When attendance drops before the cutoff, the batch prep flow is throttled.
- If notice arrives after cutoff, the flow cannot be throttled, shifting intervention to safe surplus holding.
