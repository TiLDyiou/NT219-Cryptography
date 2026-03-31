from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict

class MerchantBase(BaseModel):
    code: str = Field(..., max_length=50)
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    status: str = "pending"
    commission_rate: float = 0.0500
    is_verified: bool = False
    metadata_json: Dict = {}
    is_active: bool = True

class MerchantCreate(MerchantBase):
    pass

class MerchantUpdate(BaseModel):
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    status: Optional[str] = None
    metadata_json: Optional[Dict] = None
    is_active: Optional[bool] = None
    version: int  # Required for optimistic locking

class MerchantResponse(MerchantBase):
    id: str
    rating_avg: float
    rating_count: int
    version: int

    model_config = ConfigDict(from_attributes=True)
