# Vertex AI Search & Grounded Retrieval

## Policy Corpus Configuration

For EcoLoop, the policy datastore indexes canonical regulatory PDFs:
1. `fssai_surplus_food_regulations_2019.pdf`
2. `solid_waste_management_rules_2016_india.pdf`
3. `fssai_hygiene_guidelines_caterers.pdf`

## Creating the Datastore in Google Cloud Console
1. Navigate to **Vertex AI Search and Conversation** (formerly Discovery Engine).
2. Click **Create App** > Type: **Search** > Data Type: **Unstructured Documents**.
3. Point the ingestion pipeline to the GCS bucket `gs://project-7eb2c8c6-policy-corpus/`.
4. Enable **Extractive Answers** and **Snippets**.

## Query Guardrails
- If the search confidence is below threshold ($< 0.65$), the system must respond:
  `"Clause not found in verified policy index. Please consult a qualified food safety officer."`
- Never hallucinate legal tolerances or microbiological testing intervals.
