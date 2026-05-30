from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import httpx
import os

router = APIRouter()

KEYCLOAK_URL      = os.getenv("KEYCLOAK_URL", "http://localhost:8080")
KEYCLOAK_REALM    = os.getenv("KEYCLOAK_REALM", "nt219")
KC_ADMIN_USER     = os.getenv("KC_ADMIN_USER", "admin")
KC_ADMIN_PASSWORD = os.getenv("KC_ADMIN_PASSWORD", "admin123")


class RegisterRequest(BaseModel):
    firstName: str
    lastName:  str
    email:     EmailStr
    password:  str


async def _get_admin_token() -> str:
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
            data={
                "grant_type": "password",
                "client_id":  "admin-cli",
                "username":   KC_ADMIN_USER,
                "password":   KC_ADMIN_PASSWORD,
            },
        )
    if resp.status_code != 200:
        raise HTTPException(502, "Không thể kết nối Keycloak admin")
    return resp.json()["access_token"]


@router.post("")
async def register_user(body: RegisterRequest):
    token = await _get_admin_token()

    user_payload = {
        "firstName": body.firstName,
        "lastName":  body.lastName,
        "email":     body.email,
        "username":  body.email,
        "enabled":   True,
        "realmRoles": ["user"],
        "credentials": [{
            "type":      "password",
            "value":     body.password,
            "temporary": False,
        }],
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{KEYCLOAK_URL}/admin/realms/{KEYCLOAK_REALM}/users",
            json=user_payload,
            headers={"Authorization": f"Bearer {token}"},
        )

    if resp.status_code == 201:
        return {"success": True, "message": "Tài khoản đã được tạo thành công"}

    if resp.status_code == 409:
        raise HTTPException(409, "Email này đã được đăng ký")

    detail = resp.text or f"Keycloak trả về HTTP {resp.status_code}"
    raise HTTPException(400, detail)
