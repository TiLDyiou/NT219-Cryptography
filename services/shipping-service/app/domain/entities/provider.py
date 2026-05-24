from dataclasses import dataclass, field
from typing import Any


@dataclass
class Provider:
    id: str
    code: str
    name: str
    api_base_url: str | None = None
    logo_url: str | None = None
    is_active: bool = True
    supported_countries: list[str] = field(default_factory=lambda: ["VN"])
    capabilities: dict[str, Any] = field(default_factory=dict)
