from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.persistence.database import get_db
from app.infrastructure.persistence.repositories.template_repository import TemplateRepository
from app.schemas.response import ApiResponse
from app.schemas.template import TemplateResponse, TemplateUpsert

router = APIRouter(prefix="/templates", tags=["Admin Templates"])


def _serialize(row) -> TemplateResponse:
    return TemplateResponse(
        id=row.id,
        code=row.code,
        category=row.category,
        subject_template=row.subject_template,
        html_template=row.html_template,
        text_template=row.text_template,
        variables=row.variables or [],
        is_active=row.is_active,
    )


@router.get("", response_model=ApiResponse)
async def list_templates(session: AsyncSession = Depends(get_db)):
    rows = await TemplateRepository().list_all(session)
    return ApiResponse(data=[_serialize(row).model_dump() for row in rows])


@router.post("", response_model=ApiResponse)
async def upsert_template(payload: TemplateUpsert, session: AsyncSession = Depends(get_db)):
    row = await TemplateRepository().upsert(session, **payload.model_dump())
    await session.commit()
    return ApiResponse(data=_serialize(row).model_dump())


@router.patch("/{code}", response_model=ApiResponse)
async def patch_template(code: str, payload: TemplateUpsert, session: AsyncSession = Depends(get_db)):
    row = await TemplateRepository().upsert(session, code=code, **payload.model_dump(exclude={"code"}))
    await session.commit()
    return ApiResponse(data=_serialize(row).model_dump())
