from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, get_correlation_id, get_current_user_id_from_jwt
from app.infrastructure.container import get_container
from app.schemas.payment import CreateIntentRequest
from app.schemas.response import APIResponse

router = APIRouter()


@router.post("/intents", response_model=APIResponse)
async def create_payment_intent(
    body: CreateIntentRequest,
    jwt_sub: str = Depends(get_current_user_id_from_jwt),
    db: AsyncSession = Depends(get_db),
    correlation_id: str | None = Depends(get_correlation_id),
):
    """
    Create a Stripe PaymentIntent for a credit_card order.
    Returns client_secret for FE to call stripe.confirmPayment().
    Body contains only order_id — amount is fetched from order-service (T1 tamper prevention).
    """
    use_case = get_container().create_intent_use_case(db)
    result = await use_case.execute(order_id=body.order_id, jwt_sub=jwt_sub)
    return APIResponse(success=True, data=result, correlation_id=correlation_id)
