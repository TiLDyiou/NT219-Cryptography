from typing import Any

from fastapi import Request, status
from fastapi.responses import JSONResponse


class ShippingException(Exception):
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


class EntityNotFoundException(ShippingException):
    def __init__(self, entity: str, entity_id: str):
        super().__init__(
            message=f"{entity} with id '{entity_id}' not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
        )


class UnauthorizedException(ShippingException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, "UNAUTHORIZED")


class ForbiddenException(ShippingException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status.HTTP_403_FORBIDDEN, "FORBIDDEN")


class BusinessRuleException(ShippingException):
    def __init__(self, message: str, error_code: str = "BUSINESS_RULE_VIOLATION"):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY, error_code)


class InvalidSignatureError(ShippingException):
    def __init__(self, message: str = "Invalid request signature"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, "INVALID_SIGNATURE")


class ReplayAttackError(ShippingException):
    def __init__(self, message: str = "Replay attack detected"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, "REPLAY_ATTACK")


class IdempotencyConflictException(ShippingException):
    def __init__(self, message: str = "Idempotency key already used with different payload."):
        super().__init__(message, status.HTTP_409_CONFLICT, "IDEMPOTENCY_PAYLOAD_MISMATCH")


class OptimisticLockException(ShippingException):
    def __init__(self, expected_version: int, current_version: int):
        super().__init__(
            f"Version mismatch. Expected {expected_version}, but DB has {current_version}.",
            status.HTTP_409_CONFLICT,
            "OPTIMISTIC_LOCK_ERROR",
        )


class RLSViolationException(ShippingException):
    def __init__(self, actor_id: str, resource_id: str):
        super().__init__(
            f"Unauthorized to access resource '{resource_id}'. IDOR protection triggered.",
            status.HTTP_403_FORBIDDEN,
            "FORBIDDEN_RLS",
        )


async def custom_exception_handler(request: Request, exc: ShippingException):
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
