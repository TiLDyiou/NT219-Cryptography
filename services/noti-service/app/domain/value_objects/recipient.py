import hashlib
import re


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not local or not domain:
        return "***"
    if len(local) <= 2:
        return f"{local[0]}***@{domain}"
    return f"{local[0]}***{local[-1]}@{domain}"


def content_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


class Recipient:
    def __init__(self, email: str):
        normalized = email.strip().lower()
        if not EMAIL_PATTERN.match(normalized):
            raise ValueError("Invalid email recipient")
        self.email = normalized

    @property
    def masked(self) -> str:
        return mask_email(self.email)
