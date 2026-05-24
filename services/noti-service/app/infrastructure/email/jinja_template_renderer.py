from jinja2 import Environment, StrictUndefined, select_autoescape

from app.domain.ports.template_renderer import RenderedTemplate, TemplateRenderer


class JinjaTemplateRenderer(TemplateRenderer):
    def __init__(self):
        self._env = Environment(
            autoescape=select_autoescape(["html", "xml"]),
            undefined=StrictUndefined,
        )

    async def render(
        self,
        subject_template: str,
        html_template: str,
        text_template: str,
        variables: dict,
    ) -> RenderedTemplate:
        subject = self._env.from_string(subject_template).render(**variables)
        html = self._env.from_string(html_template).render(**variables)
        text = self._env.from_string(text_template).render(**variables)
        return RenderedTemplate(subject=subject, html_body=html, text_body=text)
