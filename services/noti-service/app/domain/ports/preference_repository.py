from abc import ABC, abstractmethod


class PreferenceRepository(ABC):
    @abstractmethod
    async def is_enabled(self, session, user_id: str, channel_id: str, category: str) -> bool:
        raise NotImplementedError
