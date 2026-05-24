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
        if request.method in {"GET", "HEAD", "OPTIONS"} or request.url.path in {"/health", "/ready", "/metrics"}:
            return await call_next(request)

        timestamp_header = request.headers.get("X-Timestamp")
        nonce = request.headers.get("X-Nonce")
        if not timestamp_header or not nonce:
            return JSONResponse(status_code=401, content={"success": False, "error": {"code": "MISSING_REPLAY_HEADERS"}})
        try:
            timestamp = int(timestamp_header)
        except ValueError:
            return JSONResponse(status_code=401, content={"success": False, "error": {"code": "INVALID_TIMESTAMP"}})
        if abs(int(time.time()) - timestamp) > settings.TIMESTAMP_TOLERANCE_SECONDS:
            return JSONResponse(status_code=401, content={"success": False, "error": {"code": "REPLAY_ATTACK"}})
        accepted = await get_container().nonce_store.consume_nonce(nonce, settings.redis.nonce_ttl_seconds)
        if not accepted:
            return JSONResponse(status_code=401, content={"success": False, "error": {"code": "REPLAY_ATTACK"}})
        return await call_next(request)
