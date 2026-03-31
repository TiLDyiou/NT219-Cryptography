from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from typing import Any

class CatalogException(Exception):
    """Base exception for catalog service"""
    def __init__(self, message: str, status_code: int = 400, error_code: str = "BAD_REQUEST", details: Any = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details

class EntityNotFoundException(CatalogException):
    def __init__(self, entity: str, id: str):
        super().__init__(
            message=f"{entity} with id '{id}' not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND"
        )

class DatabaseConflictException(CatalogException):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT"
        )

class OptimisticLockException(DatabaseConflictException):
    def __init__(self, expected_version: int, current_version: int):
        super().__init__(
            message=f"Version mismatch. Expected {expected_version}, but DB has {current_version}. Please reload and try again."
        )

class RLSViolationException(CatalogException):
    def __init__(self, actor_id: str, resource_id: str):
        super().__init__(
            message=f"Unauthorized to access resource '{resource_id}'. IDOR protection triggered.",
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN_RLS"
        )

async def custom_exception_handler(request: Request, exc: CatalogException):
    """Bắt và format lỗi đồng nhất cho API Response"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details
        }
    )
