from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class EncryptedField:
    """Opaque encrypted payload stored in the database."""

    ciphertext: bytes

    def __post_init__(self) -> None:
        if not isinstance(self.ciphertext, (bytes, bytearray)):
            raise TypeError("EncryptedField.ciphertext must be bytes")
        if len(self.ciphertext) == 0:
            raise ValueError("EncryptedField.ciphertext must not be empty")
