# EcoLoop — Stitch AI Design Generation Prompts
**Document Version:** 1.0  
**Target Tool:** Google Stitch MCP / Stitch AI Designer  
**Design Aesthetic:** Modern, high-density sustainability SaaS interface. Sleek dark mode / deep emerald forest (`#061A14`, `#0B251B`, `#10B981`) with warm amber (`#F59E0B`) warning accents and soft frosted glassmorphism surfaces (`rgba(16, 185, 129, 0.05)`). Clean typography (Plus Jakarta Sans / Inter), 44px accessible touch targets, and unmistakable regulatory safety badges.

---

## Screen Overview Map

1. **Screen 01:** Multimodal Intake & Document Capture Hub (`/intake`)
2. **Screen 02:** Candidate Extraction & Human Verification Review (`/intake/review`)
3. **Screen 03:** Pantry Expiry Radar & Inventory State (`/pantry`)
4. **Screen 04:** Pre-Cooking Decision Window & Headcount Exception Copilot (`/decision-window`)
5. **Screen 05:** FSSAI Food Recovery & Safety Eligibility Gate (`/recovery/offer`)
6. **Screen 06:** Action Proposal & Simulated Partner Dispatch (`/actions/dispatch`)
7. **Screen 07:** Chain of Custody & Dual-Party Handoff Ledger (`/recovery/handoff`)
8. **Screen 08:** Mass Balance & Verified Environmental Impact Dashboard (`/impact`)

---

### Screen 01: Multimodal Intake & Document Capture Hub
**Route / Identifier:** `SCREEN_01_INTAKE_CAPTURE`  
**Purpose:** Provide a friction-free multimodal upload interface (receipt photos, paper kitchen slips, pantry shelf camera shots, voice logs) with clear boundary warnings that extraction produces uncommitted candidates.

#### Stitch Generation Prompt:
```text
Design a modern, high-precision dark mode web application screen titled "Intake & Document Capture" for EcoLoop (a circular food resource copilot). 

Theme & Styling:
- Background: Deep slate/forest green gradient (#04130E to #081C15), text in crisp white and muted mint (#94A3B8, #A7F3D0).
- Accent Colors: Emerald Green (#10B981), Amber Glow (#F59E0B) for notice indicators.
- Border & Surfaces: Subtle translucent border (#10B98122), glassmorphism cards with smooth backdrop blur.

Layout Structure:
1. Top Bar: Workspace switcher ("Bandra Household #4"), user profile avatar, and system state indicator ("Online · Model: Gemini 2.5 Flash").
2. Prominent Safety Banner: An amber informational alert card stating: "Extraction Notice: Model parsing generates uncommitted candidates. Camera/OCR intake never certifies food safety or shelf life."
3. Primary Capture Zone:
   - A central drag-and-drop file upload target with dashed glowing borders supporting JPG, PNG, PDF, and HEIC.
   - Quick action pill buttons: "Scan Supermarket Receipt", "Capture Fridge/Pantry Shelf", "Upload Paper Kitchen Slip", "Record Voice Audio Note".
4. Preset Demo Ingestion Strip:
   - Three quick-load sample tiles for testing: "Reliance Smart Point Grocery Receipt", "Fresh Vegetable Market handwritten slip", "Weekend Leftovers Voice Memo".
5. Recent Ingestion Log Sidebar:
   - Mini feed showing recent raw ingestion jobs with thumbnail preview, timestamp, status pill ("Extracted - Pending Confirmation", "Processed", "Rejected"), and source type tag.
```

---

### Screen 02: Candidate Extraction & Human Verification Review
**Route / Identifier:** `SCREEN_02_CANDIDATE_REVIEW`  
**Purpose:** Enforce the core non-negotiable invariant where AI-parsed items remain uncommitted candidates until explicitly verified and confirmed by a human decision-maker.

#### Stitch Generation Prompt:
```text
Design an enterprise-grade dark-themed data verification screen titled "Candidate Extraction Review" for EcoLoop. 

Theme & Styling:
- Primary color: Deep obsidian-emerald (#061A14).
- Card surfaces: Dark emerald gray (#0D281E) with subtle 1px border (#10B98133).
- Badges: Purple/Cyan gradient for "AI Candidate", Bright Emerald for "Human Confirmed", Rose for "Disputed/Removed".

Layout Structure:
1. Split-View Workspace:
   - Left Panel (40% width): Raw Artifact Inspector. Displays the uploaded supermarket grocery receipt image with interactive bounding box overlays around detected text lines.
   - Right Panel (60% width): Extracted Candidates Table & Form Editor.
2. Invariant Headline: A persistent status counter showing: "4 Candidates Extracted · 0 Verified · Confirmation Required to Commit to Inventory".
3. Candidate Data Rows (Card-based table):
   - Row 1: "Ripe Tomatoes", detected quantity "1.2 kg", storage location selector [Crisper Drawer], detected shelf-life "3 days", confidence pill "96% High". Editable input fields for quantity and units.
   - Row 2: "Cow Milk / Amul Taaza", detected "2 Liters", storage location [Refrigerator Main], shelf-life "2 days", confidence pill "94% High".
   - Row 3: "Paneer (Fresh Cottage Cheese)", detected "400 g", storage location [Dairy Shelf], shelf-life "1.5 days", warning icon "Short Expiry".
   - Row 4: "Coriander / Cilantro", detected "1 bunch", low-confidence pill "68% Medium" with an amber "Needs Review" flag.
4. Per-Row Action Controls:
   - Toggle switch: "Confirm / Discard".
   - Quick correction icons: Edit pencil, split line, delete trash.
5. Sticky Bottom Action Bar:
   - Summary statistics: "3 of 4 items verified · Total weight: 3.8 kg".
   - Primary button: "Commit Verified Facts to Inventory (3 Items)" (solid emerald green #10B981 with checkmark).
   - Secondary button: "Discard Unverified Candidates".
```

---

### Screen 03: Pantry Expiry Radar & Inventory State
**Route / Identifier:** `SCREEN_03_PANTRY_RADAR`  
**Purpose:** Provide a real-time, deterministic visual inventory dashboard categorized by urgency tiers (<24h critical, <48h high, 3-7 days stable) to prevent spoilage before it happens.

#### Stitch Generation Prompt:
```text
Design a visually stunning, high-density inventory radar dashboard titled "Pantry & Expiry Radar" for EcoLoop.

Theme & Styling:
- Background: Ultra-clean dark theme (#071813) with neon emerald (#10B981) and urgent crimson (#EF4444) radar accents.
- Modern typography, clean statistics widgets, and smooth micro-card layout.

Layout Structure:
1. Metric Overview Ribbon (4 metric cards across top):
   - "Total Confirmed Stock": 38.4 kg (14 items)
   - "Critical Cutoff (<24h)": 2 items (Immediate cooking recommended)
   - "High Priority (<48h)": 4 items
   - "Diverted This Month": 12.8 kg (91% efficiency)
2. Filter & View Controls:
   - Segmented buttons: [All Items] [Refrigerator] [Pantry Shelves] [Freezer] [Produce Basket].
   - Search input and sort dropdown: "Sort by Expiry (Urgent First)".
3. Urgency Tier 1: "Critical Cutoff — Expiring within 24 Hours" (Red/Amber glowing highlight card):
   - Item card: "Fresh Paneer" (400g) — "Expires in 14 hours" — Origin: Grocery Receipt #402. Quick action button: "Cook in Next Meal".
   - Item card: "Baby Spinach" (250g) — "Expires in 18 hours" — Observation age: 2 days old.
4. Urgency Tier 2: "High Priority — 24 to 48 Hours":
   - Item cards for Ripe Tomatoes (1.2 kg), Greek Yogurt (500g), Whole Wheat Bread (1 loaf). Each with exact weight, date confirmed, and verified provenance badge.
5. Deterministic Logic Tag: A footer note: "Cutoff deadlines are calculated deterministically from verified storage dates and standard shelf-life models; no speculative AI estimation."
```

---

### Screen 04: Pre-Cooking Decision Window & Headcount Exception Copilot
**Route / Identifier:** `SCREEN_04_DECISION_WINDOW`  
**Purpose:** The central value moment of EcoLoop. Proactively trigger batch and recipe adjustments when household/kitchen attendance changes *before* cooking occurs.

#### Stitch Generation Prompt:
```text
Design a high-impact interactive decision cockpit titled "Pre-Cooking Decision Window" for EcoLoop.

Theme & Styling:
- Futuristic yet clean operational UI with glowing emerald (#10B981) and sapphire (#3B82F6) highlights.
- Clear distinction between "Original Plan" and "Optimized Decision".

Layout Structure:
1. Dinner Context Header:
   - Meal: "Dinner · Thursday, Oct 15".
   - Cooking Batch Cutoff Countdown: "Cooking begins in 45 minutes (18:30 IST)".
2. Headcount Change Exception Trigger:
   - Interactive attendance control: "Planned: 4 People" -> Slider / Stepper adjusted to: "2 People (Aashik & Priya eating out tonight)".
   - System Banner: "Headcount Exception Detected (-50% demand). Batch scaling activated to prevent over-preparation waste."
3. Side-by-Side Batch Optimization Comparison:
   - Left Card: "Original 4-Person Batch" (Requires 800g Rice, 600g Paneer, 8 Tomatoes. Predicted leftovers: ~650g unconsumed).
   - Right Card: "Optimized 2-Person Smart Batch" (Highlights: Scaled down to 400g Rice, 300g Paneer, 4 Tomatoes. Zero batch leftovers).
4. Recommended Recipe Utilizing Expiring Inventory:
   - Recipe Card: "Zero-Waste Tomato Paneer Kadai" (Utilizes 100% of the Critical Expiry Paneer and 4 Ripe Tomatoes).
   - Cooking time: 25 mins. Difficulty: Easy.
   - Ingredient coverage indicator: "100% pantry matched, 0 new purchases needed".
5. Decision Authorization Bar:
   - Signoff selector: "Cook Role: Elena V.".
   - Primary Action Button: "Approve Revised 2-Person Cooking Plan" (Full-width glowing green button).
   - Secondary Button: "Keep Original 4-Person Plan".
```

---

### Screen 05: FSSAI Food Recovery & Safety Eligibility Gate
**Route / Identifier:** `SCREEN_05_RECOVERY_GATE`  
**Purpose:** Enforce FSSAI 2019 regulatory surplus food recovery compliance. AI is strictly prohibited from certifying microbiological safety; this screen enforces mandatory human safety checklist verification.

#### Stitch Generation Prompt:
```text
Design a regulatory compliance and safety evaluation screen titled "Surplus Recovery & Safety Gate" for EcoLoop.

Theme & Styling:
- Palette: Trustworthy deep slate navy (#081420), regulatory blue (#2563EB), and amber warning badges (#F59E0B).
- Clear, legalistic yet modern checklist formatting.

Layout Structure:
1. Regulatory Header:
   - Title: "Surplus Food Redistribution Eligibility Review"
   - Regulatory citation badge: "FSSAI Surplus Food Regulations (2019) Compliant Protocol".
   - Hard Invariant Notice: "CRITICAL: Artificial intelligence models NEVER certify microbiological food safety. Eligibility requires explicit human food-safety review."
2. Surplus Batch Identity Card:
   - Batch ID: `#SUR-2026-1015-09`
   - Description: "Steamed Basmati Rice & Dal Tadka (Prepared in commercial canteen)"
   - Physical Weight: 14.5 kg (Approx. 35 adult meal portions).
   - Preparation Timestamp: Today at 14:00 (Held in insulated warm containers).
3. Mandatory Human Eligibility Checklist (Interactive Form):
   - [ ] Checkbox 1: "Touch & Service Check: Food was never served to plates or touched by consumers (Untouched batch only)."
   - [ ] Checkbox 2: "Temperature Log Verification: Cooked and hot-held consistently above 60°C (or chilled below 5°C)."
   - [ ] Checkbox 3: "Time Limit: Within 4 hours of preparation cutoff."
   - [ ] Checkbox 4: "Packaging: Food is packaged in food-grade, sealed, tamper-evident containers."
4. Human Attestation & Signature Box:
   - Name of Food Safety Supervisor / Kitchen Manager input.
   - Digital sign-off toggle: "I certify on personal responsibility that this batch complies with FSSAI hygiene standards."
5. Conditional Route Gateway:
   - If ANY safety check fails: Card turns red, displaying "Ineligible for Human Consumption -> Auto-route to Composting / Organic Anaerobic Digestion".
   - If ALL safety checks pass: Card turns green, enabling button: "Proceed to Recipient Matching".
```

---

### Screen 06: Action Proposal & Simulated Partner Dispatch
**Route / Identifier:** `SCREEN_06_SIMULATED_DISPATCH`  
**Purpose:** Provide transparent human-in-the-loop approval for partner logistics (NGO donation dispatch or Quick-Commerce grocery replenishment) with an unmistakable `[SIMULATED: TRUE]` badge.

#### Stitch Generation Prompt:
```text
Design a high-transparency operations dispatch screen titled "Action Proposal & Logistics Dispatch" for EcoLoop.

Theme & Styling:
- Background: Modern dark glass aesthetic (#0A1916).
- Highlights: Bright cyan/teal (#06B6D4) and bold orange warning badge.

Layout Structure:
1. Dominant Simulation Banner (Top):
   - High-contrast striped warning banner: "SIMULATED DISPATCH — Sandbox Environment · No actual vehicles or financial charges will occur."
2. Action Proposal Card (`ActionProposal_v1`):
   - Proposal ID: `PROP-DISP-8821`
   - Type: "NGO Food Recovery Pickup & Delivery"
   - Origin: "Central Kitchen / Household Hub #1, Indiranagar"
   - Destination: "Asha Kiran Children Shelter (Capacity: Confirmed 40 meals)"
   - Estimated Transit: 18 minutes (Cold chain not required for immediate consumption).
3. Matched Verified Partner:
   - Partner Card: "Robin Hood Army / Feeding India Verified Chapter"
   - Partner Status: "FSSAI Registered Recovery Agency #FSSAI-NGO-492"
   - Assigned Volunteer/Vehicle: "Vehicle #KA-03-HA-4412 (Insulated carrier)"
4. Reversible Decision Timer:
   - Countdown pill: "Reservation holds for 11:42 minutes before automatic release".
5. Human Authorization Control:
   - Authenticated Approver: "Logged in as: Aashik (Coordinator)".
   - Primary CTA: "Approve & Trigger Simulated Dispatch" (Emerald gradient button with lock icon).
   - Secondary CTA: "Decline Offer / Mark as Local Consumption".
```

---

### Screen 07: Chain of Custody & Dual-Party Handoff Ledger
**Route / Identifier:** `SCREEN_07_CUSTODY_HANDOFF`  
**Purpose:** Track physical handoffs between donor, driver, and recipient with independent acknowledgments and the absolute right to refuse at the door.

#### Stitch Generation Prompt:
```text
Design an immutable tracking timeline screen titled "Chain of Custody & Handoff Ledger" for EcoLoop.

Theme & Styling:
- Clean chronological timeline layout with vertical progress rail, dark slate theme (#081C17), and status markers.

Layout Structure:
1. Handoff Header:
   - Tracking ID: `TRK-2026-X889` · Batch: 14.5 kg Basmati Rice & Dal
   - Current Status Pill: "In Transit — Pickup Completed"
2. 3-Stage Progressive Timeline:
   - Step 1: "Donor Release & Kitchen Departure" (Completed · 15:15 IST)
     - Signed by: Chef Rajesh K.
     - Outgoing weight verified: 14.5 kg. Outgoing temperature recorded: 64°C.
   - Step 2: "Logistics Carrier Custody" (Active / In Transit)
     - Driver: Suresh M. (Simulated)
     - GPS ETA: 12 minutes to recipient shelter.
   - Step 3: "Recipient Acceptance & Condition Verification" (Pending Arrival)
     - Recipient: Asha Kiran Shelter
     - Recipient Rights Notice: "Recipient retains unconditional right to refuse delivery upon inspection with zero penalty."
3. Recipient Verification Simulator Modal (Preview):
   - Inputs for: Actual arrived weight (kg), Temperature on arrival (°C), Visual container integrity check.
   - Action buttons: "Accept Batch" / "Reject with Reason (Temperature Mismatch / Off Odor / Capacity Exceeded)".
```

---

### Screen 08: Mass Balance & Verified Environmental Impact Dashboard
**Route / Identifier:** `SCREEN_08_IMPACT_DASHBOARD`  
**Purpose:** Honest, non-greenwashed sustainability accounting distinguishing physically measured weights from estimated carbon models and unknown metrics.

#### Stitch Generation Prompt:
```text
Design an executive environmental accounting dashboard titled "Mass Balance & Verified Impact Ledger" for EcoLoop.

Theme & Styling:
- Deep forest emerald dark mode (#051610) with glowing data charts, circular mass balance infographics, and verifiable audit badges.

Layout Structure:
1. Honest Accounting Disclaimer Ribbon:
   - "Measurement Standard: Direct physical weighing + IPCC Tier-1 category carbon factors. Zero unverified claims."
2. Primary Mass Balance Circular Flow Diagram (SanKey or Donut representation):
   - Total Inflow: 142.5 kg Food Tracked
   - Consumed In-Home / On-Plan: 118.2 kg (83%)
   - Diverted to Recovery / NGOs: 18.5 kg (13%)
   - Organics / Composting: 4.8 kg (3.4%)
   - Landfill Waste Discarded: 1.0 kg (0.7%)
3. Core Impact Metrics (3 KPI Cards):
   - Card 1: "Physical Weight Diverted": 23.3 kg (100% physically weighed on digital scales).
   - Card 2: "Estimated GHG Methane Avoided": 44.2 kg CO2e (Calculated using FSSAI / FAO 1.9 kg CO2e/kg factor, source link cited).
   - Card 3: "Meals Provided to Community": 46 meals (Recipient verified).
4. Unmeasured / Unknown Metrics Disclosure:
   - A distinct card displaying: "Unmeasured Metrics: Household water footprint savings currently classified as 'Unknown' due to missing primary supply chain data."
5. Transaction Ledger Table:
   - Rows showing recent events: Date, Event Type ("Decision Batch Scaled", "NGO Donation", "Compost Diverted"), Weight (kg), Measurement Method ("Scale Tare", "Recipe Arithmetic"), Provenance Link.
   - Export CTA: "Download Cryptographically Signed Audit CSV".
```
