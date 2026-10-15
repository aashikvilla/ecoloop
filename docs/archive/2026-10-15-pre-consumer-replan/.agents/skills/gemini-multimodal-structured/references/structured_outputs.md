# Structured Outputs with Google GenAI SDK

## Defining Schemas with Pydantic v2

The `google-genai` SDK allows passing Python Pydantic classes directly into `types.GenerateContentConfig`:

```python
from enum import Enum
from pydantic import BaseModel, Field

class FoodCategory(str, Enum):
    PRODUCE = "Produce"
    DAIRY = "Dairy"
    BAKERY = "Bakery"
    GRAIN = "Grain"
    PROTEIN = "Protein"
    PACKAGED = "Packaged"
    OTHER = "Other"

class ParsedFoodItem(BaseModel):
    name: str = Field(description="Normalized name of ingredient/food item")
    category: FoodCategory = Field(description="Primary food category")
    quantity: float = Field(description="Numerical quantity")
    unit: str = Field(description="Standardized unit: g, kg, ml, l, pack, count")
    notes: str = Field(default="", description="Additional remarks e.g. organic, brand")
```

## Parsing Response JSON

Always wrap JSON parsing in `model_validate_json`:

```python
try:
    result = ParsedFoodItem.model_validate_json(response.text)
except Exception as e:
    # Handle schema validation errors gracefully
    raise ValueError(f"Model returned invalid schema: {e}")
```
