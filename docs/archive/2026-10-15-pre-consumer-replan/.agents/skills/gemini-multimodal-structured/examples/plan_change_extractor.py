"""Natural Language Plan Change Extractor using Gemini."""
from typing import Optional, Dict, Any
from google import genai
from google.genai import types
from pydantic import BaseModel, Field


class PlanChangeEvent(BaseModel):
    meal_type: str = Field(description="Breakfast, Lunch, Dinner, or Snack")
    original_headcount: Optional[int] = Field(None, description="Previous headcount if mentioned")
    updated_headcount: int = Field(description="New number of people eating")
    reason: Optional[str] = Field(None, description="Brief reason e.g. 'friend cancelled', 'eating out'")
    time_of_event: Optional[str] = Field(None, description="Reported meal time if stated e.g. '8 PM'")
    dietary_exclusions: list[str] = Field(default_factory=list, description="Any dietary restrictions mentioned")


def parse_plan_change_text(user_message: str) -> Dict[str, Any]:
    """Extract structured headcount adjustment and meal context from messy user text."""
    client = genai.Client()

    prompt = f"Parse the following user message for changes in meal plans or headcount:\n\"{user_message}\""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=PlanChangeEvent,
            temperature=0.0,
            system_instruction=(
                "Extract meal change events accurately. "
                "Default meal_type to 'Dinner' if evening is implied and unspecified."
            ),
        ),
    )

    result = PlanChangeEvent.model_validate_json(response.text)
    return result.model_dump()
