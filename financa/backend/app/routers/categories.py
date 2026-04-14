import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryOut])
async def list_categories(
    type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[Category]:
    q = select(Category).order_by(Category.sort_order, Category.name)
    if type:
        q = q.where(Category.type == type)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.post("/", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Category:
    cat = Category(id=str(uuid.uuid4()), **payload.model_dump())
    db.add(cat)
    await db.flush()
    return cat


@router.patch("/{category_id}", response_model=CategoryOut)
async def update_category(
    category_id: str,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Category:
    cat = await db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if cat.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system categories")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(cat, field, value)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> None:
    cat = await db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if cat.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system categories")
    await db.delete(cat)
