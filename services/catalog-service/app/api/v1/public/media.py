import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.core.config import settings

router = APIRouter()

_FILENAME_RE = re.compile(r"^[a-f0-9]{32}\.(jpg|jpeg|png|webp|gif)$", re.IGNORECASE)
_MERCHANT_ID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


@router.get("/media/{merchant_id}/{filename}")
async def get_product_media(merchant_id: str, filename: str):
    """Serve uploaded product images (public read)."""
    if not _MERCHANT_ID_RE.match(merchant_id) or not _FILENAME_RE.match(filename):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    path = Path(settings.UPLOAD_DIR) / merchant_id / filename
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    media_type = _MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")
    return FileResponse(path, media_type=media_type)
