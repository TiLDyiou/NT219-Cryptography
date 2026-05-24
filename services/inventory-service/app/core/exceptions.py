from typing import Any

from fastapi import Request, status
from fastapi.responses import JSONResponse


class InventoryException(Exception):
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


class EntityNotFoundException(InventoryException):
    def __init__(self, entity: str, entity_id: str):
        super().__init__(
            message=f"{entity} with id '{entity_id}' not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
        )


class UnauthorizedException(InventoryException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED",
        )


class ForbiddenException(InventoryException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
        )


class BusinessRuleException(InventoryException):
    def __init__(self, message: str, error_code: str = "BUSINESS_RULE_VIOLATION"):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code=error_code,
        )


class OutOfStockException(InventoryException):
    def __init__(self, product_id: str, sku: str | None = None):
        detail = f"Insufficient stock for product '{product_id}'"
        if sku:
            detail += f" (sku={sku})"
        super().__init__(
            message=detail,
            status_code=status.HTTP_409_CONFLICT,
            error_code="OUT_OF_STOCK",
        )


class IdempotencyConflictException(InventoryException):
    def __init__(
        self, message: str = "Idempotency key already used with different payload."
    ):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="IDEMPOTENCY_PAYLOAD_MISMATCH",
        )


class ReplayAttackError(InventoryException):
    def __init__(self, message: str = "Replay attack detected"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="REPLAY_ATTACK",
        )


class InvalidSignatureError(InventoryException):
    def __init__(self, message: str = "Invalid request signature"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="INVALID_SIGNATURE",
        )


class OptimisticLockException(InventoryException):
    def __init__(self, expected_version: int, current_version: int):
        super().__init__(
            message=f"Version mismatch. Expected {expected_version}, but DB has {current_version}.",
            status_code=status.HTTP_409_CONFLICT,
            error_code="OPTIMISTIC_LOCK_ERROR",
        )


class RLSViolationException(InventoryException):
    def __init__(self, actor_id: str, resource_id: str):
        super().__init__(
            message=f"Unauthorized to access resource '{resource_id}'. IDOR protection triggered.",
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN_RLS",
        )


async def custom_exception_handler(request: Request, exc: InventoryException):
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
