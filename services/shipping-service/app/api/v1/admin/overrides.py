from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_admin_user, get_correlation_id, get_db
from app.infrastructure.container import get_container
from app.schemas.response import APIResponse

router = APIRouter()


class StatusOverrideRequest(BaseModel):
    status: str


@router.post("/shipments/{shipment_id}/override", response_model=APIResponse[dict])
async def override_shipment_status(
    shipment_id: str,
    body: StatusOverrideRequest,
    db: AsyncSession = Depends(get_db),
    admin_id: str = Depends(get_admin_user),
    correlation_id: Optional[str] = Depends(get_correlation_id),
):
    repo = get_container().shipment_repository
    audit = get_container().audit_logger
    shipment = await repo.get(db, shipment_id)
    old_status = shipment.status
    shipment = await repo.update_status(db, shipment, body.status)
    await audit.log_change(
        db,
        "shipments",
        shipment.id,
        "UPDATE",
        {"status": old_status},
        {"status": shipment.status},
        actor_id=admin_id,
        actor_type="admin",
        correlation_id=correlation_id,
    )
    await db.commit()
    return APIResponse(success=True, data={"shipment_id": shipment.id, "status": shipment.status})
