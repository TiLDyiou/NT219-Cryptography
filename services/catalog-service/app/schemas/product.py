from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, Dict, List

class ProductBase(BaseModel):
    sku: str = Field(..., max_length=100)
    name: str = Field(..., max_length=255)
    status: str = "draft"
    product_type: str = "physical"
    base_price: float = Field(..., ge=0)
    currency_code: str = "VND"
    weight_grams: Optional[int] = None
    is_taxable: bool = True
    brand: Optional[str] = None
    metadata_json: Dict = {}
    images: List[Dict] = []
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    base_price: Optional[float] = Field(None, ge=0)
    images: Optional[List[Dict]] = None
    is_active: Optional[bool] = None
    version: int # Req for optimistic locking

class ProductResponse(ProductBase):
    id: str
    merchant_id: str
    version: int

    model_config = ConfigDict(from_attributes=True)
