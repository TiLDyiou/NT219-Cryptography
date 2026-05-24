from dataclasses import dataclass


@dataclass
class PreferenceEntity:
    user_id: str
    channel_id: str
    category: str
    is_enabled: bool = True
    id: str | None = None
