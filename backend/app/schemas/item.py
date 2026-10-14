from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ItemBase(BaseModel):
    title: str = Field(..., description="Title of the circular/eco asset or item")
    description: Optional[str] = Field(None, description="Detailed description")
    category: str = Field("Recycled Material", description="Category of the item")
    eco_impact_score: float = Field(0.0, description="Estimated CO2 reduction score or eco impact in kg")
    is_active: bool = Field(True, description="Whether the listing is active")


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    eco_impact_score: Optional[float] = None
    is_active: Optional[bool] = None


class Item(ItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
