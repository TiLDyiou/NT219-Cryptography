from typing import Any, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_correlation_id, get_current_merchant_id, get_db
from app.infrastructure.container import get_container
from app.schemas.inventory import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryStockUpdate,
    WarehouseCreate,
    WarehouseResponse,
    WarehouseUpdate,
)
from app.schemas.response import APIResponse

router = APIRouter()


@router.get("/warehouses", response_model=APIResponse[list[WarehouseResponse]])
async def list_warehouses(
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.merchant_warehouse_use_case(db)
    data = await usecase.list(merchant_id)
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.post("/warehouses", response_model=APIResponse[WarehouseResponse], status_code=201)
async def create_warehouse(
    body: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.merchant_warehouse_use_case(db)
    data = await usecase.create(merchant_id, body.model_dump())
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.put("/warehouses/{warehouse_id}", response_model=APIResponse[WarehouseResponse])
async def update_warehouse(
    warehouse_id: str,
    body: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.merchant_warehouse_use_case(db)
    data = await usecase.update(
        merchant_id, warehouse_id, body.model_dump(exclude_unset=True)
    )
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.get("/inventory", response_model=APIResponse[list[InventoryItemResponse]])
async def list_inventory(
    warehouse_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.merchant_inventory_use_case(db)
    data = await usecase.list(merchant_id, warehouse_id)
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.post("/inventory", response_model=APIResponse[InventoryItemResponse], status_code=201)
async def create_inventory_item(
    body: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.merchant_inventory_use_case(db)
    data = await usecase.upsert(merchant_id, body.model_dump())
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.put("/inventory/{item_id}", response_model=APIResponse[InventoryItemResponse])
async def update_inventory_stock(
    item_id: str,
    body: InventoryStockUpdate,
    db: AsyncSession = Depends(get_db),
    merchant_id: str = Depends(get_current_merchant_id),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    container = get_container()
    usecase = container.merchant_inventory_use_case(db)
    data = await usecase.update_stock(merchant_id, item_id, body.model_dump())
    return APIResponse(success=True, data=data, correlation_id=correlation_id)
