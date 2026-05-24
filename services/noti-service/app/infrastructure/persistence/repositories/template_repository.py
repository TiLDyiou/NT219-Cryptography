from sqlalchemy import select

from app.infrastructure.persistence.models import NotificationChannelModel, NotificationTemplateModel


class TemplateRepository:
    async def get_by_code(self, session, code: str) -> NotificationTemplateModel | None:
        result = await session.execute(
            select(NotificationTemplateModel)
            .where(NotificationTemplateModel.code == code)
            .where(NotificationTemplateModel.is_active.is_(True))
        )
        return result.scalar_one_or_none()

    async def list_all(self, session) -> list[NotificationTemplateModel]:
        result = await session.execute(select(NotificationTemplateModel).order_by(NotificationTemplateModel.code))
        return list(result.scalars().all())

    async def upsert(
        self,
        session,
        code: str,
        category: str,
        subject_template: str,
        html_template: str,
        text_template: str,
        variables: list[str] | None = None,
        is_active: bool = True,
    ) -> NotificationTemplateModel:
        channel = await self.get_email_channel(session)
        existing = await self.get_by_code(session, code)
        if existing is None:
            existing = NotificationTemplateModel(
                code=code,
                channel_id=channel.id,
                category=category,
                subject_template=subject_template,
                html_template=html_template,
                text_template=text_template,
                variables=variables or [],
                is_active=is_active,
            )
            session.add(existing)
        else:
            existing.category = category
            existing.subject_template = subject_template
            existing.html_template = html_template
            existing.text_template = text_template
            existing.variables = variables or []
            existing.is_active = is_active
        await session.flush()
        return existing

    async def get_email_channel(self, session) -> NotificationChannelModel:
        result = await session.execute(select(NotificationChannelModel).where(NotificationChannelModel.code == "email"))
        channel = result.scalar_one_or_none()
        if channel is None:
            channel = NotificationChannelModel(
                code="email",
                name="Email",
                provider="gmail_smtp",
                rate_limit={"max_per_minute": 10},
            )
            session.add(channel)
            await session.flush()
        return channel
