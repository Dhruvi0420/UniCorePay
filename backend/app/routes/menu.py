from fastapi import APIRouter, HTTPException, status
from typing import List
from app.models import FoodItem, FoodItemCreate
from app import db

router = APIRouter(prefix="/menu", tags=["Menu Management"])


@router.get("", response_model=List[FoodItem])
async def list_menu_items():
    """Fetch all food items currently on the menu."""
    return db.get_all_menu_items()


@router.post("", response_model=FoodItem, status_code=status.HTTP_201_CREATED)
async def create_menu_item(item: FoodItemCreate):
    """Add a new food item to the menu (from Admin desk)."""
    created = db.add_menu_item(
        name=item.name.strip(),
        description=item.description.strip(),
        price=round(item.price, 2),
        emoji=item.emoji.strip() if item.emoji else "🍽️",
        category=item.category.strip() if item.category else "Meals",
        available=item.available,
    )
    return created


@router.delete("/{item_id}")
async def remove_menu_item(item_id: str):
    """Remove a food item from the menu."""
    success = db.delete_menu_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "deleted", "id": item_id}


@router.patch("/{item_id}/toggle")
async def toggle_item_availability(item_id: str):
    """Toggle availability (in stock / sold out) for a food item."""
    new_state = db.toggle_menu_item_availability(item_id)
    if new_state is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"id": item_id, "available": new_state}
