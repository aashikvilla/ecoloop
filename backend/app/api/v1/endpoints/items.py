from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from app.schemas.item import Item, ItemCreate, ItemUpdate

router = APIRouter()

# In-memory storage for initial bootstrap
_ITEMS_DB: List[Item] = [
    Item(
        id=1,
        title="Industrial Recycled Polypropylene Pellets",
        description="High-grade post-consumer recycled PP pellets suitable for molding.",
        category="Plastics",
        eco_impact_score=45.2,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    ),
    Item(
        id=2,
        title="Reclaimed Hardwood Timber Beams",
        description="Salvaged architectural timber beams from structural deconstruction.",
        category="Timber",
        eco_impact_score=120.0,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    ),
    Item(
        id=3,
        title="Recovered Textile Fiber Bundles",
        description="Clean shredded cotton-poly blend fibers for insulation manufacturing.",
        category="Textiles",
        eco_impact_score=32.5,
        is_active=True,
        created_at=datetime.now(timezone.utc),
    ),
]


@router.get("/", response_model=List[Item], tags=["EcoLoop Items"])
async def list_items():
    """Retrieve all circular economy items."""
    return _ITEMS_DB


@router.get("/{item_id}", response_model=Item, tags=["EcoLoop Items"])
async def get_item(item_id: int):
    """Retrieve details of a specific circular economy item."""
    for item in _ITEMS_DB:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")


@router.post("/", response_model=Item, status_code=status.HTTP_201_CREATED, tags=["EcoLoop Items"])
async def create_item(payload: ItemCreate):
    """Register a new circular item into the EcoLoop catalog."""
    new_id = max([i.id for i in _ITEMS_DB], default=0) + 1
    new_item = Item(
        id=new_id,
        created_at=datetime.now(timezone.utc),
        **payload.model_dump(),
    )
    _ITEMS_DB.append(new_item)
    return new_item


@router.patch("/{item_id}", response_model=Item, tags=["EcoLoop Items"])
async def update_item(item_id: int, payload: ItemUpdate):
    """Update details of an existing circular item."""
    for idx, item in enumerate(_ITEMS_DB):
        if item.id == item_id:
            update_data = payload.model_dump(exclude_unset=True)
            updated_item = item.model_copy(update=update_data)
            _ITEMS_DB[idx] = updated_item
            return updated_item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["EcoLoop Items"])
async def delete_item(item_id: int):
    """Remove an item from the EcoLoop catalog."""
    for idx, item in enumerate(_ITEMS_DB):
        if item.id == item_id:
            _ITEMS_DB.pop(idx)
            return
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
