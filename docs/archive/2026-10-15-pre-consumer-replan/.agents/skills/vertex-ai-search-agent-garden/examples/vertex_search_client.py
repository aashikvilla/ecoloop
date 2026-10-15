"""Vertex AI Search Client for Policy & Regulatory Retrieval."""
import os
from typing import List, Dict, Any
from google.cloud import discoveryengine_v1 as discoveryengine


class PolicySearchClient:
    def __init__(self, project_id: str = None, datastore_id: str = "ecoloop-policy-datastore"):
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID", "project-7eb2c8c6-27da-46d0-827")
        self.datastore_id = datastore_id
        self.location = "global"
        self.client = discoveryengine.SearchServiceClient()

    def search_regulations(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """Search regulatory datastore and return extracted snippets with citations."""
        serving_config = (
            f"projects/{self.project_id}/locations/{self.location}/"
            f"collections/default_collection/dataStores/{self.datastore_id}/"
            f"servingConfigs/default_search"
        )

        request = discoveryengine.SearchRequest(
            serving_config=serving_config,
            query=query,
            page_size=limit,
            content_search_spec=discoveryengine.SearchRequest.ContentSearchSpec(
                snippet_spec=discoveryengine.SearchRequest.ContentSearchSpec.SnippetSpec(
                    return_snippet=True
                ),
            ),
        )

        try:
            response = self.client.search(request)
            results = []
            for item in response.results:
                struct_data = item.document.derived_struct_data
                snippets = struct_data.get("snippets", [])
                snippet_text = snippets[0].get("snippet", "") if snippets else ""
                results.append({
                    "document_id": item.document.id,
                    "title": struct_data.get("title", "Regulatory Document"),
                    "snippet": snippet_text,
                })
            return results
        except Exception as e:
            # Fallback mock for local development
            return [
                {
                    "document_id": "mock-fssai-2019",
                    "title": "FSSAI Surplus Food Regulations 2019 (Local Fallback)",
                    "snippet": "Surplus food must be handled in accordance with hygienic practices. Cooked food must be distributed within 4 hours if maintained between 5C and 65C.",
                }
            ]
