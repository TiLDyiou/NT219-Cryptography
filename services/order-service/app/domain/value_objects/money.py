from decimal import Decimal
from typing import Self


class Money:
    """Immutable monetary amount wrapper."""

    __slots__ = ("_amount",)

    def __init__(self, amount: Decimal | str | float | int):
        self._amount = Decimal(str(amount)).quantize(Decimal("0.01"))

    @property
    def amount(self) -> Decimal:
        return self._amount

    def __add__(self, other: "Money") -> "Money":
        return Money(self._amount + other._amount)

    def __sub__(self, other: "Money") -> "Money":
        return Money(self._amount - other._amount)

    def __mul__(self, factor: int | Decimal) -> "Money":
        return Money(self._amount * Decimal(str(factor)))

    def __truediv__(self, divisor: int | Decimal) -> "Money":
        return Money(self._amount / Decimal(str(divisor)))

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self._amount == other._amount

    def __hash__(self) -> int:
        return hash(self._amount)

    def __repr__(self) -> str:
        return f"Money({self._amount})"

    @classmethod
    def zero(cls) -> Self:
        return cls(Decimal("0"))
