from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

router = APIRouter()


class RegisterRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str


@router.post("")
async def register_user(body: RegisterRequest):
    raise HTTPException(
        status_code=410,
        detail="Đăng ký tài khoản phải thực hiện qua Keycloak registration flow.",
    )
