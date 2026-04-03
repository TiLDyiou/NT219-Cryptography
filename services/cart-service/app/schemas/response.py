from typing import Generic, Optional, TypeVar
from pydantic import BaseModel

DataT = TypeVar("DataT")


class APIResponse(BaseModel, Generic[DataT]):
    success: bool = True
    data: Optional[DataT] = None
    error_code: Optional[str] = None
    message: Optional[str] = None
