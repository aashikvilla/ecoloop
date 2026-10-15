"""Grounded RAG Query combining Vertex Search with Gemini."""
from typing import Dict, Any
from google import genai
from google.genai import types
from .vertex_search_client import PolicySearchClient


def answer_policy_question(question: str) -> Dict[str, Any]:
    """Retrieve verified policy citations and generate a grounded answer."""
    search_client = PolicySearchClient()
    citations = search_client.search_regulations(question, limit=2)

    context_str = "\n".join([f"Source: {c['title']}\nContent: {c['snippet']}" for c in citations])

    client = genai.Client()
    prompt = (
        f"Verified Policy Context:\n{context_str}\n\n"
        f"User Regulatory Question: {question}\n\n"
        "Provide a concise, grounded answer. You must explicitly cite the source. "
        "Include the mandatory disclaimer: 'This information does not replace formal FSSAI food safety inspection.'"
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=0.0,
            system_instruction="You are a strict regulatory compliance assistant for food recovery and waste diversion.",
        ),
    )

    return {
        "question": question,
        "answer": response.text,
        "citations": citations,
    }
