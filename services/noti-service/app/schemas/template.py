from pydantic import BaseModel, Field


class TemplateUpsert(BaseModel):
    code: str = Field(min_length=1, max_length=100)
    category: str
    subject_template: str
    html_template: str
    text_template: str
    variables: list[str] = []
    is_active: bool = True


class TemplateResponse(BaseModel):
    id: str
    code: str
    category: str
    subject_template: str
    html_template: str
    text_template: str
    variables: list[str]
    is_active: bool
