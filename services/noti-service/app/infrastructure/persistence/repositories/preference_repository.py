from sqlalchemy import select

from app.domain.ports.preference_repository import PreferenceRepository
from app.infrastructure.persistence.models import UserNotificationPreferenceModel


class PgPreferenceRepository(PreferenceRepository):
    async def is_enabled(self, session, user_id: str, channel_id: str, category: str) -> bool:
        if category == "security":
            return True
        result = await session.execute(
            select(UserNotificationPreferenceModel).where(
                UserNotificationPreferenceModel.user_id == user_id,
                UserNotificationPreferenceModel.channel_id == channel_id,
                UserNotificationPreferenceModel.category == category,
            )
        )
        preference = result.scalar_one_or_none()
        return True if preference is None else bool(preference.is_enabled)
