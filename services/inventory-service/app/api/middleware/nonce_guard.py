import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from app.core.config import settings
from app.infrastructure.container import get_container


class NonceGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not settings.REQUIRE_NONCE_GUARD:
            return await call_next(request)

        if request.method in {"GET", "HEAD", "OPTIONS"}:
            return await call_next(request)

        if request.url.path in {"/health", "/ready", "/metrics"}:
            return await call_next(request)

        timestamp_header = request.headers.get("X-Timestamp")
        nonce = request.headers.get("X-Nonce")

        if not timestamp_header or not nonce:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "MISSING_REPLAY_HEADERS",
                        "message": "X-Timestamp and X-Nonce headers are required.",
                    },
                },
            )

        try:
            timestamp = int(timestamp_header)
        except ValueError:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "INVALID_TIMESTAMP",
                        "message": "X-Timestamp must be a Unix epoch integer.",
                    },
                },
            )

        now = int(time.time())
        if abs(now - timestamp) > settings.TIMESTAMP_TOLERANCE_SECONDS:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "REPLAY_ATTACK",
                        "message": "Request timestamp outside acceptable window.",
                    },
                },
            )

        container = get_container()
        accepted = await container.nonce_store.consume_nonce(
            nonce, settings.redis.nonce_ttl_seconds
        )
        if not accepted:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "error": {
                        "code": "REPLAY_ATTACK",
                        "message": "Nonce already used (possible replay).",
                    },
                },
            )

        return await call_next(request)
