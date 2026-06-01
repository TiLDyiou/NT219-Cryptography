import logging
from typing import Any
from fastapi import APIRouter, Depends, Header, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.dependencies import get_db
from app.infrastructure.container import get_container

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
):
    if not stripe_signature:
        logger.warning("Stripe webhook received but missing Stripe-Signature header.")
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"success": False, "error": "Missing Stripe-Signature header"},
        )

    payload_bytes = await request.body()
    container = get_container()
    usecase = container.handle_webhook_use_case(db)

    try:
        result = await usecase.execute(payload_bytes, stripe_signature)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"success": True, "data": result},
        )
    except Exception as e:
        from app.core.exceptions import InvalidSignatureError
        if isinstance(e, InvalidSignatureError):
            logger.warning("Stripe webhook signature verification failed")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"success": False, "error": str(e)},
            )
        logger.exception("Failed to process Stripe webhook")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"success": False, "error": str(e)},
        )
