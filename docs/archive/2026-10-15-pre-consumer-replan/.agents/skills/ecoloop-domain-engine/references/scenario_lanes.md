# Operational Scenario Lanes

Detailed workflow specifications for the three core prototype scenarios:

## Lane H: Household Decision Copilot
- **Actor Roles**: Food buyer, family cook, adult diner.
- **Inputs**:
  - Grocery receipts (multimodal image or quick-commerce text invoice).
  - Household chat / audio notes ("Rohan and Priya aren't coming for dinner tonight").
- **State Reconciled**:
  - Pantry inventory updated with confirmed purchased items.
  - Planned recipe servings updated from 4 to 2.
- **Outputs**:
  - Exact recalculated recipe weights (e.g. rice reduced from 300g to 150g).
  - Prevented purchases (e.g. coriander and cream already in pantry; removed from proposed cart).
  - Simulated quick-commerce checkout draft (`simulated: true`).

## Lane K: Institutional Kitchen Cutoff
- **Actor Roles**: Headcount coordinator, head chef, inventory supervisor.
- **Inputs**:
  - Group absence message or attendance feed.
  - Kitchen batch schedule (menu, preparation start cutoff, meal service time).
- **Cutoff Rule**:
  - If event received $\ge 45$ minutes before meal time $\implies$ Batch scaled down before irreversible cooking.
  - If event received $< 45$ minutes before meal time $\implies$ Batch already cooking. Recommends safe packaging and surplus notification.

## Lane R: Qualified Surplus & NGO Recovery
- **Actor Roles**: Food donor supervisor, NGO coordinator, driver, receiving institution.
- **Eligibility Protocol**:
  - Food category must be unused, unserved, or sealed commercial packaging.
  - Prepared cooked food must be dispatched within 4 hours of cooking or maintained below 5°C.
  - Mandatory human inspection checklist: visual appearance, smell, temperature reading, packaging seal.
  - Capacity check: NGO must explicitly confirm transport availability before dispatch.
