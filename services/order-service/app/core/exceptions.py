from typing import Any

from fastapi import Request, status
from fastapi.responses import JSONResponse


class OrderException(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "BAD_REQUEST",
        details: Any = None,
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details


class EntityNotFoundException(OrderException):
    def __init__(self, entity: str, entity_id: str):
        super().__init__(
            message=f"{entity} with id '{entity_id}' not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
        )


class UnauthorizedException(OrderException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED",
        )


class ForbiddenException(OrderException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
        )


class BusinessRuleException(OrderException):
    def __init__(self, message: str, error_code: str = "BUSINESS_RULE_VIOLATION"):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code=error_code,
        )


class IdempotencyConflictException(OrderException):
    def __init__(self):
        super().__init__(
            message="Idempotency key already used with different payload.",
            status_code=status.HTTP_409_CONFLICT,
            error_code="IDEMPOTENCY_PAYLOAD_MISMATCH",
        )


async def custom_exception_handler(request: Request, exc: OrderException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details,
            },
            "correlation_id": request.headers.get("X-Correlation-Id"),
        },
    )

