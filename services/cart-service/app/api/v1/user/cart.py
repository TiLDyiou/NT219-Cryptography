from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user_id, get_db
from app.crud.cart import cart as crud_cart
from app.schemas.cart import (
    CartConvertRequest,
    CartItemAddRequest,
    CartItemUpdateRequest,
    CartResponse,
)
from app.schemas.response import APIResponse

router = APIRouter()


@router.get("", response_model=APIResponse[List[CartResponse]])
async def list_my_active_carts(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    carts = await crud_cart.list_active_carts_of_user(db, user_id=user_id)
    return APIResponse(success=True, data=[CartResponse.model_validate(c) for c in carts])


@router.get("/{merchant_id}", response_model=APIResponse[CartResponse])
async def get_or_create_my_cart(
    merchant_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    cart = await crud_cart.get_or_create_active_cart(db, user_id=user_id, merchant_id=merchant_id)
    return APIResponse(success=True, data=CartResponse.model_validate(cart))


@router.post("/{merchant_id}/items", response_model=APIResponse[CartResponse])
async def add_item_to_cart(
    merchant_id: str,
    item_in: CartItemAddRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    cart = await crud_cart.add_item(
        db,
        user_id=user_id,
        merchant_id=merchant_id,
        item_in=item_in,
    )
    return APIResponse(success=True, data=CartResponse.model_validate(cart))


@router.put("/{merchant_id}/items/{item_id}", response_model=APIResponse[CartResponse])
async def update_item_quantity(
    merchant_id: str,
    item_id: str,
    item_in: CartItemUpdateRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    cart = await crud_cart.update_item_quantity(
        db,
        user_id=user_id,
        merchant_id=merchant_id,
        item_id=item_id,
        expected_cart_version=item_in.cart_version,
        quantity=item_in.quantity,
    )
    return APIResponse(success=True, data=CartResponse.model_validate(cart))


@router.delete("/{merchant_id}/items/{item_id}", response_model=APIResponse[CartResponse])
async def remove_item(
    merchant_id: str,
    item_id: str,
    cart_version: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    cart = await crud_cart.remove_item(
        db,
        user_id=user_id,
        merchant_id=merchant_id,
        item_id=item_id,
        expected_cart_version=cart_version,
    )
    return APIResponse(success=True, data=CartResponse.model_validate(cart))


@router.delete("/{merchant_id}/items", response_model=APIResponse[CartResponse])
async def clear_cart(
    merchant_id: str,
    cart_version: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    cart = await crud_cart.clear_cart(
        db,
        user_id=user_id,
        merchant_id=merchant_id,
        expected_cart_version=cart_version,
    )
    return APIResponse(success=True, data=CartResponse.model_validate(cart))


@router.post("/{merchant_id}/convert", response_model=APIResponse[CartResponse])
async def convert_cart(
    merchant_id: str,
    payload: CartConvertRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    converted = await crud_cart.convert_cart(
        db,
        user_id=user_id,
        merchant_id=merchant_id,
        expected_cart_version=payload.cart_version,
    )
    return APIResponse(success=True, data=CartResponse.model_validate(converted))
