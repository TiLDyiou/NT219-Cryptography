from dataclasses import dataclass

from app.core.exceptions import BusinessRuleException


@dataclass(frozen=True)
class Dimensions:
    length: float
    width: float
    height: float
    weight_grams: int

    def __post_init__(self) -> None:
        if min(self.length, self.width, self.height) <= 0:
            raise BusinessRuleException("Package dimensions must be positive.")
        if self.weight_grams <= 0:
            raise BusinessRuleException("Package weight must be positive.")

    def to_dict(self) -> dict[str, float | int]:
        return {
            "length": self.length,
            "width": self.width,
            "height": self.height,
            "weight_grams": self.weight_grams,
        }
