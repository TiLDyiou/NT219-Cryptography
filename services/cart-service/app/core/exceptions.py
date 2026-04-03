from typing import Any
from fastapi import status, Request
from fastapi.responses import JSONResponse


class CartException(Exception):
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


class EntityNotFoundException(CartException):
    def __init__(self, entity: str, entity_id: str):
        super().__init__(
            message=f"{entity} with id '{entity_id}' not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
        )


class OptimisticLockException(CartException):
    def __init__(self, expected_version: int, current_version: int):
        super().__init__(
            message=(
                f"Version mismatch. Expected version {expected_version}, "
                f"but request has {current_version}."
            ),
            status_code=status.HTTP_409_CONFLICT,
            error_code="VERSION_CONFLICT",
        )


class UnauthorizedException(CartException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED",
        )


class BusinessRuleException(CartException):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code="BUSINESS_RULE_VIOLATION",
        )


async def custom_exception_handler(request: Request, exc: CartException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
        },
    )
