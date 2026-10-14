---
name: gemini-multimodal-structured
description: >-
  Extract structured, schema-validated JSON from multimodal inputs (receipts, pantry images, text, audio)
  using the official Google GenAI SDK (google-genai). Use when parsing receipts, handwritten notes,
  plan changes, or configuring Pydantic response schemas and prompt safety guardrails in EcoLoop.
---

# Gemini Multimodal Structured Extraction Skill

This skill provides patterns for extracting strictly validated data from images, receipts, and natural language messages using the official `google-genai` SDK and Pydantic v2.

## Key Principles
1. **Pydantic Schema Enforcement**: Never ask the model to "output JSON" in freeform text. Always supply `response_schema` in `types.GenerateContentConfig`.
2. **Determinism over Creativity**: Set `temperature=0.0` or `0.1` for parsing tasks.
3. **Food Safety Disclaimer**: A photo never certifies freshness, absence of pathogens, or consumption safety.

---

## 1. SDK Installation & Imports

```bash
pip install google-genai pydantic
```

```python
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
```

---

## 2. Receipt OCR Pattern

Extract itemized grocery items and prices directly from image bytes or files:

```python
from typing import List, Optional

class ReceiptItem(BaseModel):
    name: str = Field(description="Normalized product name")
    category: str = Field(description="Dairy, Produce, Bakery, Grain, Meat, Pantry, etc.")
    quantity: float = Field(description="Purchased quantity or weight")
    unit: str = Field(description="kg, g, pack, piece, ml, l")
    price_inr: Optional[float] = Field(None, description="Line item price in INR")

class ReceiptIntakeResult(BaseModel):
    store_name: Optional[str] = Field(None, description="Merchant or store name")
    transaction_date: Optional[str] = Field(None, description="ISO date YYYY-MM-DD if present")
    items: List[ReceiptItem] = Field(default_factory=list)
    total_amount_inr: Optional[float] = None
    extraction_confidence: float = Field(description="Confidence score between 0.0 and 1.0")
```

---

## 3. Extraction Invocation

```python
client = genai.Client()

with open("receipt.jpg", "rb") as f:
    image_bytes = f.read()

response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[
        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
        "Extract all purchased grocery items from this receipt. Normalize item names and units.",
    ],
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=ReceiptIntakeResult,
        temperature=0.0,
        system_instruction="You are an expert grocery receipt parser for Indian quick-commerce and retail receipts.",
    ),
)

parsed_data = ReceiptIntakeResult.model_validate_json(response.text)
```

---

## 4. References & Examples
- [Structured Outputs & Schema Specification](./references/structured_outputs.md)
- [Prompt Guardrails & Anti-Hallucination Guidelines](./references/prompt_guardrails.md)
- [Full Receipt Parser Implementation](./examples/receipt_parser.py)
- [Natural Language Plan Change Extractor](./examples/plan_change_extractor.py)
