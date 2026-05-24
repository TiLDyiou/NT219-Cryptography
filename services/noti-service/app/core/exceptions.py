from typing import Any

from fastapi import Request, status
from fastapi.responses import JSONResponse


class NotificationException(Exception):
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


class EntityNotFoundException(NotificationException):
    def __init__(self, entity: str, entity_id: str):
        super().__init__(
            f"{entity} with id '{entity_id}' not found.",
            status.HTTP_404_NOT_FOUND,
            "NOT_FOUND",
        )


class BusinessRuleException(NotificationException):
    def __init__(self, message: str, error_code: str = "BUSINESS_RULE_VIOLATION"):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY, error_code)


class UnauthorizedException(NotificationException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, "UNAUTHORIZED")


class InvalidSignatureError(NotificationException):
    def __init__(self, message: str = "Invalid request signature"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, "INVALID_SIGNATURE")


class ReplayAttackError(NotificationException):
    def __init__(self, message: str = "Replay attack detected"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED, "REPLAY_ATTACK")


async def custom_exception_handler(request: Request, exc: NotificationException):
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
