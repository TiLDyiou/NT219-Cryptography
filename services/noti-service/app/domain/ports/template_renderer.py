from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class RenderedTemplate:
    subject: str
    html_body: str
    text_body: str


class TemplateRenderer(ABC):
    @abstractmethod
    async def render(
        self,
        subject_template: str,
        html_template: str,
        text_template: str,
        variables: dict,
    ) -> RenderedTemplate:
        raise NotImplementedError
