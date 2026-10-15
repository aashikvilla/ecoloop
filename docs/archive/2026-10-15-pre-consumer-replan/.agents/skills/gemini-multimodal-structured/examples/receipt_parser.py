"""Receipt Parsing Service using Gemini Multimodal Structured Outputs."""
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
from pydantic import BaseModel, Field


class ReceiptItem(BaseModel):
    name: str = Field(description="Normalized grocery or food item name")
    quantity: float = Field(default=1.0, description="Quantity or weight purchased")
    unit: str = Field(default="count", description="Normalized unit: kg, g, ml, l, pack, piece")
    price_inr: Optional[float] = Field(None, description="Price in INR")
    category: str = Field(default="Pantry", description="Produce, Dairy, Bakery, Protein, Grain, etc.")


class ReceiptExtractionResult(BaseModel):
    store_name: Optional[str] = Field(None, description="Identified merchant or store name")
    receipt_date: Optional[str] = Field(None, description="Date of purchase in YYYY-MM-DD format")
    items: List[ReceiptItem] = Field(default_factory=list)
    total_amount_inr: Optional[float] = None
    confidence_score: float = Field(default=1.0, description="Confidence between 0.0 and 1.0")


def parse_receipt_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
    """Parse image bytes of a grocery receipt into structured Pydantic data."""
    client = genai.Client()

    prompt = (
        "Extract all grocery and food items from this receipt. "
        "Standardize units (e.g., 500 grams -> quantity: 500, unit: 'g'). "
        "Calculate confidence_score based on legibility."
    )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ReceiptExtractionResult,
            temperature=0.0,
            system_instruction=(
                "You are an expert grocery receipt parser. "
                "Never invent items not visible on the receipt. "
                "Do not assess food safety."
            ),
        ),
    )

    result = ReceiptExtractionResult.model_validate_json(response.text)
    return result.model_dump()
