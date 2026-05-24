import email.utils
import logging
import time
from email.message import EmailMessage as MimeEmailMessage

from app.core.config import SmtpConfig
from app.domain.ports.email_gateway import EmailGateway, EmailMessage, EmailSendResult

logger = logging.getLogger(__name__)


class VaultSmtpCredentialProvider:
    def __init__(self, smtp_config: SmtpConfig, vault_client=None, secret_path: str | None = None, refresh_seconds: int = 1800):
        self._smtp_config = smtp_config
        self._vault_client = vault_client
        self._secret_path = secret_path
        self._refresh_seconds = refresh_seconds
        self._cached: SmtpConfig | None = None
        self._loaded_at = 0.0

    async def get(self) -> SmtpConfig:
        now = time.time()
        if self._cached is not None and now - self._loaded_at < self._refresh_seconds:
            return self._cached
        if self._vault_client is None or self._secret_path is None:
            self._cached = self._smtp_config
            self._loaded_at = now
            return self._cached
        data = await self._vault_client.read_kv2(self._secret_path)
        self._cached = self._smtp_config.model_copy(
            update={
                "username": data.get("username"),
                "app_password": data.get("app_password"),
                "from_address": data.get("from_address", self._smtp_config.from_address),
                "from_name": data.get("from_name", self._smtp_config.from_name),
            }
        )
        self._loaded_at = now
        return self._cached


class SmtpEmailGateway(EmailGateway):
    def __init__(self, credential_provider: VaultSmtpCredentialProvider):
        self._credential_provider = credential_provider

    async def send(self, message: EmailMessage) -> EmailSendResult:
        try:
            import aiosmtplib
        except ImportError as exc:
            return EmailSendResult(False, error_code="SMTP_LIB_MISSING", error_message=str(exc))

        cfg = await self._credential_provider.get()
        if not cfg.username or not cfg.app_password:
            return EmailSendResult(False, error_code="SMTP_CREDENTIALS_MISSING", error_message="SMTP credentials missing")

        mime = MimeEmailMessage()
        mime["From"] = email.utils.formataddr((cfg.from_name, cfg.from_address))
        mime["To"] = message.to_email
        mime["Subject"] = message.subject
        mime["Date"] = email.utils.formatdate(localtime=True)
        mime["Message-ID"] = email.utils.make_msgid(domain=cfg.from_address.split("@")[-1])
        for key, value in (message.headers or {}).items():
            mime[key] = value
        mime.set_content(message.text_body)
        mime.add_alternative(message.html_body, subtype="html")

        try:
            smtp = aiosmtplib.SMTP(hostname=cfg.host, port=cfg.port, timeout=cfg.timeout_seconds, start_tls=False)
            await smtp.connect()
            if cfg.starttls_required:
                await smtp.starttls(validate_certs=True)
            await smtp.login(cfg.username, cfg.app_password)
            response = await smtp.send_message(mime)
            await smtp.quit()
            return EmailSendResult(
                True,
                provider_message_id=mime["Message-ID"],
                provider_response={"smtp_response": str(response)},
            )
        except Exception as exc:
            logger.warning("SMTP send failed without PII: %s", exc.__class__.__name__)
            return EmailSendResult(False, error_code=exc.__class__.__name__, error_message=str(exc))


class FakeEmailGateway(EmailGateway):
    def __init__(self, fail: bool = False):
        self.fail = fail
        self.sent: list[EmailMessage] = []

    async def send(self, message: EmailMessage) -> EmailSendResult:
        self.sent.append(message)
        if self.fail:
            return EmailSendResult(False, error_code="FAKE_SMTP_FAILURE", error_message="forced failure")
        return EmailSendResult(True, provider_message_id="fake-message-id", provider_response={"mock": True})
