# EcoLoop — Editable Mermaid Diagrams

These reproduce all 14 diagrams embedded in the consolidated blueprint. They are design diagrams, not actual deployed architecture.


## 01 Core Product Loop

![Rendered flowchart](diagrams/01_core_product_loop.png)

```mermaid
flowchart LR
  CAP["Capture or import<br/>food evidence"]
  TRUTH["Confirm available<br/>kitchen facts"]
  ASK["Ask EcoLoop<br/>photo / text / voice"]
  ACTION["Cook, compare or<br/>share in time"]
  LOG["Record actual<br/>outcome"]
  PROG["Show sourced<br/>progress"]
  ORG["Genuine scraps →<br/>appropriate handling"]
  CAP --> TRUTH
  TRUTH --> ASK
  ASK --> ACTION
  ACTION --> LOG
  LOG --> PROG
  ACTION -->|not usable as food| ORG
  ORG --> LOG
  PROG -->|new observations| TRUTH
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class TRUTH action
  class ASK core
  class ACTION action
  class PROG action
  class ORG caution
```


## 02 Screen Navigation

![Rendered flowchart](diagrams/02_screen_navigation.png)

```mermaid
flowchart LR
  LOGIN["Welcome / Login"]
  MODE["Solo / Create /<br/>Join family"]
  HOME["HOME<br/>Priorities + impact"]
  KITCH["KITCHEN<br/>Items + reminders"]
  ASK["ASK<br/>Contextual GenUI"]
  SHOP["SHOP<br/>List + comparison"]
  CAP["Add Food<br/>Photo / receipt / list"]
  REV["Review and confirm"]
  ACT["Use soon / share /<br/>compost or dispose"]
  PROG["Progress + evidence"]
  SETS["Settings / Connections<br/>/ Memory privacy"]
  LOGIN --> MODE
  MODE --> HOME
  HOME --> KITCH
  HOME --> ASK
  HOME --> SHOP
  KITCH --> CAP
  CAP --> REV
  REV --> KITCH
  KITCH --> ACT
  ACT --> ASK
  ACT --> PROG
  HOME --> PROG
  HOME --> SETS
  SHOP --> ASK
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class HOME core
  class KITCH action
  class ASK action
  class SHOP action
  class ACT caution
```


## 03 Onboarding And Consent

![Rendered flowchart](diagrams/03_onboarding_and_consent.png)

```mermaid
flowchart LR
  W["Welcome<br/>Try demo / Sign in"]
  S["Firebase Auth<br/>Google / email"]
  H["Select kitchen mode"]
  SO["Solo<br/>no invitations"]
  CR["Create family<br/>invite optional"]
  JO["Join by invitation<br/>requires approval"]
  PREF["Optional preferences<br/>consent to remember"]
  ADD["Add a few items<br/>or skip"]
  FIRST["First useful action<br/>cook / check / buy"]
  W --> S
  S --> H
  H -->|solo| SO
  H -->|create| CR
  H -->|join| JO
  SO --> PREF
  CR --> PREF
  JO --> PREF
  PREF --> ADD
  ADD --> FIRST
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class W core
  class SO action
  class CR action
  class JO action
  class PREF caution
  class FIRST core
```


## 04 Multimodal Capture And Commit

![Rendered flowchart](diagrams/04_multimodal_capture_and_commit.png)

```mermaid
flowchart LR
  PHOTO["Camera / receipt /<br/>written list / manual"]
  EX["Gemini produces<br/>CANDIDATE items"]
  REV["Review names, units,<br/>quantity, date source"]
  DUP["Check existing<br/>stock / duplicate"]
  DEC["Replace / Add /<br/>Separate / Skip"]
  AUTH["Authenticated user<br/>approves"]
  DB["Firestore versioned<br/>confirmed facts"]
  REJ["Uncertain → needs<br/>check; do not infer"]
  PHOTO --> EX
  EX --> REV
  REV --> DUP
  REV -->|uncertainty| REJ
  DUP --> DEC
  DEC --> AUTH
  AUTH --> DB
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class REV caution
  class DEC action
  class AUTH action
  class DB core
  class REJ caution
```


## 05 One Assistant Many Contexts

![Rendered flowchart](diagrams/05_one_assistant_many_contexts.png)

```mermaid
flowchart LR
  HOME["Home → cook<br/>suggestion"]
  KITCH["Kitchen → selected<br/>food context"]
  SHOP["Shop → product<br/>photo or list"]
  LEFT["Use-soon →<br/>leftover context"]
  AG["ONE EcoLoop Assistant<br/>current session"]
  CARD["Typed UI card:<br/>recipe / comparison / action"]
  AP["User edits and<br/>approves"]
  TOOL["FastAPI trusted tool<br/>updates state"]
  HOME --> AG
  KITCH --> AG
  SHOP --> AG
  LEFT --> AG
  AG --> CARD
  CARD --> AP
  AP --> TOOL
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class AG core
  class CARD action
  class AP action
```


## 06 Shopping Decision

![Rendered flowchart](diagrams/06_shopping_decision.png)

```mermaid
flowchart LR
  IMAGE["Product photo /<br/>shopping item"]
  PARSE["Gemini candidate<br/>product + pack size"]
  CHECK["Confirm scanned<br/>product details"]
  STOCK["Check last-confirmed<br/>stock + selected recipe"]
  CHOICE["Have enough?<br/>Need / uncertain"]
  NO["Use current stock /<br/>check again"]
  LIST["Update shopping<br/>list with approval"]
  MCP["Merchant catalog /<br/>MCP (only authorized)"]
  CART["Cart PREVIEW; human<br/>review, no auto-charge"]
  IMAGE --> PARSE
  PARSE --> CHECK
  CHECK --> STOCK
  STOCK --> CHOICE
  CHOICE -->|enough| NO
  CHOICE -->|missing| LIST
  LIST -->|optional| MCP
  MCP --> CART
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class CHECK action
  class CHOICE caution
  class NO action
  class LIST action
  class MCP caution
  class CART core
```


## 07 Prevention Sharing And Disposal

![Rendered flowchart](diagrams/07_prevention_sharing_and_disposal.png)

```mermaid
flowchart LR
  REM["Use-soon / may not<br/>use before trip"]
  COND["Person verifies<br/>condition + availability"]
  US["Cook or store<br/>while suitable"]
  SHARE["Offer eligible items<br/>early (not waste)"]
  AC["Trusted/family user<br/>accepts and handoff"]
  UNSAFE["No longer suitable<br/>for eating / scraps"]
  MAT["Check local material<br/>acceptance rules"]
  DISP["Home compost / verified<br/>service / wet waste bin"]
  EVENT["Record what actually<br/>happened and evidence"]
  REM --> COND
  COND -->|usable| US
  COND -->|usable surplus| SHARE
  SHARE --> AC
  COND -->|unsuitable| UNSAFE
  UNSAFE --> MAT
  MAT --> DISP
  US --> EVENT
  AC --> EVENT
  DISP --> EVENT
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class REM core
  class COND caution
  class US action
  class SHARE action
  class UNSAFE caution
  class MAT caution
  class DISP action
  class EVENT core
```


## 08 Impact Evidence Ladder

![Rendered flowchart](diagrams/08_impact_evidence_ladder.png)

```mermaid
flowchart LR
  L1["INTENTION<br/>Reminder / recommendation"]
  L2["USER ACTION<br/>Approved / marked used"]
  L3["HANDOFF<br/>Accepted / collected"]
  L4["OBSERVATION<br/>Weighed or recorded result"]
  L5["COMPARISON<br/>Defensible baseline / control"]
  L6["IMPACT ESTIMATE<br/>Only with sourced factors"]
  L1 --> L2
  L2 --> L3
  L3 --> L4
  L4 --> L5
  L5 --> L6
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class L1 caution
  class L4 action
  class L5 action
  class L6 core
```


## 09 Google Cloud Runtime Architecture

![Rendered flowchart](diagrams/09_google_cloud_runtime_architecture.png)

```mermaid
flowchart LR
  WEB["Next.js / TypeScript<br/>Firebase App Hosting"]
  AUTH["Firebase Auth +<br/>role/tenant checks"]
  API["FastAPI on Cloud Run<br/>policy + approvals"]
  AG["Agent Platform Runtime<br/>Google ADK + Gemini"]
  MEM["Memory Bank: opt-in<br/>preferences"]
  SESSION["Managed Sessions<br/>short-term context"]
  FACT["Firestore: confirmed<br/>kitchen events"]
  PHOTO["Cloud Storage:<br/>consented media"]
  UI["Trusted React cards<br/>optional A2UI"]
  MCP["Merchant MCP adapter<br/>DISABLED until authorized"]
  TRACE["Cloud Logging / Trace<br/>Agent evaluation"]
  BQ["BigQuery metrics<br/>actual observations"]
  WEB --> AUTH
  AUTH --> API
  API --> AG
  AG --> MEM
  AG --> SESSION
  AG --> FACT
  API --> PHOTO
  AG --> UI
  UI --> WEB
  API -->|conditional| MCP
  API --> TRACE
  API --> BQ
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class WEB core
  class API action
  class UI action
  class MCP caution
```


## 10 Adk Delegation And Tools

![Rendered flowchart](diagrams/10_adk_delegation_and_tools.png)

```mermaid
flowchart LR
  ROOT["Coordinator agent<br/>intent + context"]
  KIT["Kitchen agent<br/>recipes, substitutions"]
  SHOP["Shopping agent<br/>compare packs, draft list"]
  REC["Food Action tools<br/>use, share, disposal"]
  M["Memory Bank + Sessions<br/>only scoped context"]
  DB["Firestore facts<br/>queried via tools"]
  GUARD["FastAPI validators<br/>permissions and math"]
  UI["Structured typed<br/>interactive response"]
  ROOT --> KIT
  ROOT --> SHOP
  ROOT -->|tools first| REC
  KIT --> GUARD
  SHOP --> GUARD
  REC --> GUARD
  ROOT --> M
  ROOT --> DB
  GUARD --> UI
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class ROOT core
  class REC caution
  class GUARD action
  class UI action
```


## 11 Status State Machines

![Rendered flowchart](diagrams/11_status_state_machines.png)

```mermaid
flowchart LR
  CAND["Observed / parsed<br/>CANDIDATE"]
  CONF["User confirms<br/>CONFIRMED"]
  STALE["Record ages<br/>NEEDS CHECK"]
  USE["Used / stored /<br/>discarded recorded"]
  OFFER["Share offer<br/>OFFERED"]
  ACCEPT["Recipient accepts<br/>ACCEPTED"]
  GIVEN["Actual handoff<br/>HANDED OVER"]
  BIN["Organic waste<br/>COLLECTED"]
  PROC["Actual processor proof<br/>PROCESSED"]
  CAND --> CONF
  CONF --> STALE
  CONF --> USE
  CONF --> OFFER
  OFFER --> ACCEPT
  ACCEPT --> GIVEN
  USE -->|if scraps| BIN
  BIN -->|requires proof| PROC
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class CAND caution
  class CONF action
  class STALE caution
  class GIVEN action
  class PROC action
```


## 12 Three Minute Demo Timeline

![Rendered flowchart](diagrams/12_three_minute_demo_timeline.png)

```mermaid
flowchart LR
  PROB["00:00–00:20<br/>Problem + Home"]
  CAP["00:20–00:48<br/>Capture + correction"]
  CHAT["00:48–01:28<br/>Memory + interactive cards"]
  SHOP["01:28–02:05<br/>Photo: Should I buy?"]
  SHARE["02:05–02:37<br/>Offer early / record"]
  PROOF["02:37–03:00<br/>Google tools + eval proof"]
  PROB --> CAP
  CAP --> CHAT
  CHAT --> SHOP
  SHOP --> SHARE
  SHARE --> PROOF
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class CAP action
  class SHOP action
  class PROOF core
```


## 13 Permissions And Ownership

![Rendered flowchart](diagrams/13_permissions_and_ownership.png)

```mermaid
flowchart LR
  PERS["Personal account<br/>private history"]
  FAM["Family kitchen<br/>shared, permissioned"]
  OD["Order history<br/>private by default"]
  STOCK["Confirmed shared<br/>stock and plans"]
  MEM["Personal Memory Bank<br/>explicit opt-in"]
  OFF["Offer to household<br/>scoped visibility"]
  REAL["External actor action<br/>requires consent"]
  PERS -->|join/create| FAM
  PERS --> OD
  PERS --> MEM
  FAM --> STOCK
  FAM --> OFF
  OFF -->|explicit approval| REAL
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class PERS core
  class FAM action
  class OD caution
  class OFF action
  class REAL caution
```


## 14 Coding Gate Sequence

![Rendered flowchart](diagrams/14_coding_gate_sequence.png)

```mermaid
flowchart LR
  A["G0 Design tokens<br/>+ routes"]
  B["G1 Mock data<br/>+ deterministic flows"]
  C["G2 Auth + Firestore<br/>role protections"]
  D["G3 Gemini photo<br/>+ user confirmation"]
  E["G4 ADK + Memory Bank<br/>+ typed GenUI"]
  F["G5 Sharing/outcome<br/>+ optional MCP mock"]
  G["G6 Real tests<br/>+ Google deployment"]
  A --> B
  B --> C
  C --> D
  D --> E
  E --> F
  F --> G
  classDef core fill:#173e32,color:#fff,stroke:#173e32
  classDef action fill:#dff2e6,color:#173e32,stroke:#85b299
  classDef caution fill:#fff0d8,color:#47311a,stroke:#bd8e43
  class B action
  class C action
  class F action
  class G core
```
