import os
import uuid
import re
from pathlib import Path
from typing import Tuple, Generator
from fastapi import HTTPException, status, UploadFile
from fastapi.responses import StreamingResponse, Response
from app.core.config import settings

def get_tenant_upload_dir(tenant_id: int, subfolder: str = "media") -> Path:
    target_dir = settings.UPLOAD_DIR / f"tenant_{tenant_id}" / subfolder
    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir

async def save_uploaded_file(file: UploadFile, tenant_id: int, is_video: bool = False) -> str:
    ext = Path(file.filename or "").suffix.lower()
    
    if is_video:
        allowed_exts = {".mp4", ".mov", ".webm", ".m4v"}
        if ext not in allowed_exts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的视频格式，仅支持: {', '.join(allowed_exts)}"
            )
        max_size = settings.MAX_VIDEO_SIZE_BYTES
        subfolder = "videos"
    else:
        allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
        if ext not in allowed_exts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的图片格式，仅支持: {', '.join(allowed_exts)}"
            )
        max_size = settings.MAX_IMAGE_SIZE_BYTES
        subfolder = "covers"

    save_dir = get_tenant_upload_dir(tenant_id, subfolder)
    unique_name = f"{uuid.uuid4().hex[:12]}_{re.sub(r'[^a-zA-Z0-9_.-]', '', file.filename or 'file')}"
    target_path = save_dir / unique_name
    
    bytes_written = 0
    with open(target_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            bytes_written += len(chunk)
            if bytes_written > max_size:
                f.close()
                if target_path.exists():
                    target_path.unlink()
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"文件体积超过限制 (最大允许 {max_size // (1024 * 1024)}MB)"
                )
            f.write(chunk)
            
    # Return relative URL that our media router serves
    return f"/api/v1/media/stream/tenant_{tenant_id}/{subfolder}/{unique_name}"


def range_requests_response(path: Path, range_header: str | None) -> Response:
    if not path.exists():
        raise HTTPException(status_code=404, detail="文件未找到")

    file_size = path.stat().st_size
    content_type = "video/mp4" if path.suffix.lower() == ".mp4" else "application/octet-stream"
    
    if not range_header:
        # Standard full response
        def full_iter():
            with open(path, "rb") as f:
                while chunk := f.read(1024 * 512):
                    yield chunk

        return StreamingResponse(
            full_iter(),
            status_code=200,
            headers={
                "Content-Length": str(file_size),
                "Accept-Ranges": "bytes",
                "Content-Type": content_type,
            }
        )

    # Parse range header: "bytes=start-end"
    range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not range_match:
        raise HTTPException(status_code=416, detail="Invalid Range header")

    start = int(range_match.group(1))
    end = int(range_match.group(2)) if range_match.group(2) else file_size - 1

    if start >= file_size or end >= file_size or start > end:
        raise HTTPException(
            status_code=416,
            detail="Range Not Satisfiable",
            headers={"Content-Range": f"bytes */{file_size}"}
        )

    chunk_size = end - start + 1

    def ranged_iter():
        with open(path, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            while remaining > 0:
                read_len = min(remaining, 1024 * 256)
                data = f.read(read_len)
                if not data:
                    break
                remaining -= len(data)
                yield data

    return StreamingResponse(
        ranged_iter(),
        status_code=206,
        headers={
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
            "Content-Type": content_type,
        }
    )
