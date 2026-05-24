from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class EmailMessage:
    to_email: str
    subject: str
    html_body: str
    text_body: str
    headers: dict[str, str] | None = None


@dataclass(frozen=True)
class EmailSendResult:
    success: bool
    provider_message_id: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    provider_response: dict | None = None


class EmailGateway(ABC):
    @abstractmethod
    async def send(self, message: EmailMessage) -> EmailSendResult:
        raise NotImplementedError
