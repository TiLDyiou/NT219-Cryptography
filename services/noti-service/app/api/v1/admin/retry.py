from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundException
from app.infrastructure.container import get_container
from app.infrastructure.persistence.database import get_db
from app.schemas.response import ApiResponse

router = APIRouter(prefix="/notifications", tags=["Admin Notifications"])


@router.post("/{notification_id}/retry", response_model=ApiResponse)
async def retry_notification(notification_id: str, session: AsyncSession = Depends(get_db)):
    container = get_container()
    row = await container.notification_repository.get(session, notification_id)
    if row is None:
        raise EntityNotFoundException("Notification", notification_id)
    result = await container.retry_failed_notification_use_case(session).execute(row)
    return ApiResponse(data={"notification_id": notification_id, "result": None if result is None else result.status})
