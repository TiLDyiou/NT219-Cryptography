from jinja2 import StrictUndefined
from jinja2.sandbox import SandboxedEnvironment

from app.domain.ports.template_renderer import RenderedTemplate, TemplateRenderer


class JinjaTemplateRenderer(TemplateRenderer):
    def __init__(self):
        # C-09: SandboxedEnvironment chặn truy cập thuộc tính/hàm nguy hiểm trong template
        # (vd __class__, __mro__...) → chống SSTI/RCE khi template do admin nạp vào.
        # H-15: từ from_string không có tên file nên select_autoescape vô tác dụng; phải
        # bật autoescape=True TƯỜNG MINH cho HTML để biến người dùng không chèn được HTML/XSS.
        # Subject/text là plaintext nên không escape (tránh biến & -> &amp; trong email text).
        self._html_env = SandboxedEnvironment(autoescape=True, undefined=StrictUndefined)
        self._text_env = SandboxedEnvironment(autoescape=False, undefined=StrictUndefined)

    async def render(
        self,
        subject_template: str,
        html_template: str,
        text_template: str,
        variables: dict,
    ) -> RenderedTemplate:
        subject = self._text_env.from_string(subject_template).render(**variables)
        html = self._html_env.from_string(html_template).render(**variables)
        text = self._text_env.from_string(text_template).render(**variables)
        return RenderedTemplate(subject=subject, html_body=html, text_body=text)
