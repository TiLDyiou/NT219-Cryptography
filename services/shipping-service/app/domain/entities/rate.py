from dataclasses import dataclass
from decimal import Decimal


@dataclass
class Rate:
    id: str
    merchant_id: str
    provider_id: str
    name: str
    base_fee: Decimal
    per_kg_fee: Decimal
    currency: str = "VND"
    is_active: bool = True
