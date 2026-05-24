from dataclasses import dataclass

from app.core.exceptions import BusinessRuleException


@dataclass(frozen=True)
class Address:
    line1: str
    city: str
    country_code: str
    line2: str | None = None
    state: str | None = None
    postal_code: str | None = None

    def __post_init__(self) -> None:
        if not self.line1.strip():
            raise BusinessRuleException("Address line1 is required.")
        if len(self.country_code) != 2:
            raise BusinessRuleException("country_code must be ISO-3166 alpha-2.")

    def public_mask(self) -> dict[str, str | None]:
        return {
            "city": self.city,
            "state": self.state,
            "country_code": self.country_code,
            "postal_code": self.postal_code,
        }
