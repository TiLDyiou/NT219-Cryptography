from typing import Any

from pydantic import BaseModel


class ProviderCreate(BaseModel):
    code: str
    name: str
    api_base_url: str | None = None
    logo_url: str | None = None
    is_active: bool = True
    supported_countries: list[str] = ["VN"]
    capabilities: dict[str, Any] = {}


class ProviderUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    api_base_url: str | None = None
    logo_url: str | None = None
    is_active: bool | None = None
    supported_countries: list[str] | None = None
    capabilities: dict[str, Any] | None = None


class ProviderResponse(BaseModel):
    id: str
    code: str
    name: str
    api_base_url: str | None = None
    logo_url: str | None = None
    is_active: bool
    supported_countries: list[str]
    capabilities: dict[str, Any]
