from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import httpx

from app.core.config import settings

router = APIRouter()


class RegisterRequest(BaseModel):
    firstName: str
    lastName:  str
    email:     EmailStr
    password:  str


async def _get_admin_token() -> str:
    kc = settings.KEYCLOAK_URL.rstrip("/")
    base_url = kc if kc.endswith("/auth") else f"{kc}/auth"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/realms/master/protocol/openid-connect/token",
            data={
                "grant_type": "password",
                "client_id":  "admin-cli",
                "username":   settings.KC_ADMIN_USER,
                "password":   settings.KC_ADMIN_PASSWORD,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(502, f"Không thể kết nối Keycloak admin: {resp.status_code} {resp.text}")
    return resp.json()["access_token"]


@router.post("")
async def register_user(body: RegisterRequest):
    token = await _get_admin_token()
    kc = settings.KEYCLOAK_URL.rstrip("/")
    base_url = kc if kc.endswith("/auth") else f"{kc}/auth"

    user_payload = {
        "firstName":     body.firstName,
        "lastName":      body.lastName,
        "email":         body.email,
        "username":      body.email,
        "enabled":       True,
        "emailVerified": True,
        "realmRoles":    ["user"],
        "credentials": [{
            "type":      "password",
            "value":     body.password,
            "temporary": False,
        }],
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base_url}/admin/realms/{settings.KEYCLOAK_REALM}/users",
            json=user_payload,
            headers={"Authorization": f"Bearer {token}"},
        )

    if resp.status_code == 201:
        return {"success": True, "message": "Tài khoản đã được tạo thành công"}

    if resp.status_code == 409:
        raise HTTPException(409, "Email này đã được đăng ký")

    detail = resp.text or f"Keycloak trả về HTTP {resp.status_code}"
    raise HTTPException(400, detail)
