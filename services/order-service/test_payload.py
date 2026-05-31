from pydantic import BaseModel, Field, ValidationError
from typing import Optional

class AddressPayload(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: str = Field(..., min_length=1, max_length=50)
    email: Optional[str] = Field(None, max_length=255)
    address_line1: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state_province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)

try:
    AddressPayload(
        full_name="",
        phone="",
        email=None,
        address_line1="",
        city="",
        state_province=None,
        postal_code=None
    )
    print("Success")
except ValidationError as e:
    print(e)
