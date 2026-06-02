import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_correlation_id, get_db
from app.core.config import settings
from app.infrastructure.container import get_container
from app.schemas.response import APIResponse

router = APIRouter()


@router.post("/webhooks/ghn", response_model=APIResponse[dict])
async def receive_ghn_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    payload = await request.body()
    adapter = await get_container().carrier_factory.get("ghn")
    # verify_webhook xác minh chữ ký HMAC GHN + timestamp (ghn_webhook_verifier).
    parsed = await adapter.verify_webhook(payload, dict(request.headers))
    event = {
        "status": parsed.get("status") or parsed.get("order_status"),
        "description": parsed.get("description") or parsed.get("status") or "GHN status update",
        "location": parsed.get("location"),
        "raw_payload": parsed,
    }
    tracking_number = parsed.get("tracking_number") or parsed.get("order_code")
    # H-12: không có mã vận đơn thì KHÔNG truy vấn (tránh match nhầm shipment có
    # tracking_number IS NULL).
    if not tracking_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook missing tracking_number/order_code.",
        )
    data = await get_container().record_tracking_event_use_case(db).execute(tracking_number, event)
    return APIResponse(success=True, data=data, correlation_id=correlation_id)


@router.post("/webhooks/mock", response_model=APIResponse[dict])
async def receive_mock_webhook(
    body: dict,
    db: AsyncSession = Depends(get_db),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    # C-10: endpoint test (không xác thực) — tắt hoàn toàn ở môi trường production
    # để kẻ tấn công không thể tự đặt trạng thái giao hàng tuỳ ý.
    if settings.is_production:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    tracking_number = body.get("tracking_number")
    if not tracking_number or not body.get("status"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mock webhook requires tracking_number and status.",
        )
    event = {
        "status": body["status"],
        "description": body.get("description") or body["status"],
        "location": body.get("location"),
        "raw_payload": json.loads(json.dumps(body, default=str)),
    }
    data = await get_container().record_tracking_event_use_case(db).execute(
        tracking_number, event
    )
    return APIResponse(success=True, data=data, correlation_id=correlation_id)
