---
name: vertex-ai-search-agent-garden
description: >-
  Connect to Google Vertex AI Search (Discovery Engine) for grounded policy RAG and leverage
  Vertex AI Model Garden / Agent Garden for model discovery, deployment, and grounded generation.
  Use when querying FSSAI food safety regulations, local solid waste management (SWM) bylaws,
  or configuring Agent Garden models in EcoLoop.
---

# Vertex AI Search & Agent Garden Skill

This skill provides step-by-step guidance for grounding LLM decisions in official policy manuals (FSSAI surplus food regulations, municipal compost standards) using Vertex AI Search and discovering foundation models via Google Cloud Model Garden.

## Key Capabilities
- **Vertex AI Search (Discovery Engine)**: Managed semantic search and retrieval over unstructured PDFs and policies.
- **Model Garden & Agent Garden**: Selecting and deploying verified foundation models (`gemini-2.5-flash`, `gemini-1.5-pro`) on Vertex AI.
- **Grounded Attribution**: Every citation references official page numbers and legal clauses without hallucination.

---

## 1. Grounded RAG Architecture

```text
[User / Donor Query] 
         │
         ▼
[Vertex AI Search Datastore] ──> Documents: FSSAI 2019 Gazette, SWM Bylaws
         │
         ▼ (Retrieves Top Chunks & Extractive Answers)
[Gemini in Agent Garden] 
         │
         ▼
[Grounded Decision with Cited Clauses & Disclaimer]
```

---

## 2. Vertex AI Search Python Client

```python
from google.cloud import discoveryengine_v1 as discoveryengine

def query_policy_corpus(
    project_id: str,
    datastore_id: str,
    search_query: str,
    location: str = "global",
) -> list[dict]:
    """Retrieve grounded chunks from Vertex AI Search datastore."""
    client = discoveryengine.SearchServiceClient()
    serving_config = (
        f"projects/{project_id}/locations/{location}/collections/default_collection/"
        f"dataStores/{datastore_id}/servingConfigs/default_search"
    )

    request = discoveryengine.SearchRequest(
        serving_config=serving_config,
        query=search_query,
        page_size=3,
        content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
            snippet_spec=discoveryengine.SearchRequest.ContentSearchSpec.SnippetSpec(
                return_snippet=True
            ),
            extractive_content_spec=discoveryengine.SearchRequest.ContentSearchSpec.ExtractiveContentSpec(
                max_extractive_answer_count=1
            ),
        ),
    )

    response = client.search(request)
    results = []
    for r in response.results:
        results.append({
            "id": r.document.id,
            "title": r.document.derived_struct_data.get("title"),
            "snippet": r.document.derived_struct_data.get("snippets", [{}])[0].get("snippet"),
        })
    return results
```

---

## 3. References & Examples
- [Vertex AI Search RAG Guide](./references/vertex_search_rag.md)
- [Agent Garden Foundation Models](./references/model_garden_tuning.md)
- [Search Client Implementation](./examples/vertex_search_client.py)
- [Grounded RAG Query with Gemini](./examples/grounded_rag_query.py)
