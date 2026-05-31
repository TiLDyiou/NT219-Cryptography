from pydantic import BaseModel, Field


class UploadImageResponse(BaseModel):
    url: str = Field(..., description="Public URL to use in product.images[].url")
