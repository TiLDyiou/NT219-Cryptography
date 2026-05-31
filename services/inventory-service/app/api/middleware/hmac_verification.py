from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.core.config import settings
from app.infrastructure.container import get_container


class HmacVerificationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not settings.REQUIRE_INBOUND_HMAC:
            return await call_next(request)

        if request.url.path in {"/health", "/ready", "/metrics", "/docs", "/openapi.json", "/redoc"}:
            return await call_next(request)

        # Merchant/public routes dùng JWT — HMAC chỉ enforce cho /internal/ và /system/ (S2S)
        if "/internal/" not in request.url.path and "/system/" not in request.url.path:
            return await call_next(request)

        signature = request.headers.get("X-Signature")
        timestamp = request.headers.get("X-Timestamp")
        nonce = request.headers.get("X-Nonce")

        if not signature or not timestamp or not nonce:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "MISSING_SIGNATURE_HEADERS",
                        "message": "X-Signature, X-Timestamp, and X-Nonce are required.",
                    },
                },
            )

        body = await request.body()

        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}

        request._receive = receive

        container = get_container()
        valid = await container.crypto_service.verify_request(
            method=request.method,
            path=request.url.path,
            body=body,
            timestamp=timestamp,
            nonce=nonce,
            signature=signature,
        )
        if not valid:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "INVALID_SIGNATURE",
                        "message": "Request signature verification failed.",
                    },
                },
            )

        return await call_next(request)
