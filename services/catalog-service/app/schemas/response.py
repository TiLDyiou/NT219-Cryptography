from typing import Generic, TypeVar, List, Optional
from pydantic import BaseModel, Field

DataT = TypeVar('DataT')

class Pagination(BaseModel):
    total: int
    page: int
    size: int

class APIResponse(BaseModel, Generic[DataT]):
    success: bool = True
    data: Optional[DataT] = None
    pagination: Optional[Pagination] = None
    error_code: Optional[str] = None
    message: Optional[str] = None
