from dataclasses import dataclass, field
from typing import Any


@dataclass
class TemplateEntity:
    code: str
    channel_id: str
    category: str
    subject_template: str
    html_template: str
    text_template: str
    variables: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    id: str | None = None
    is_active: bool = True
