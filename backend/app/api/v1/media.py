from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Header, Request, HTTPException, status
from app.core.config import settings
from app.core.deps import get_current_tenant
from app.models.entities import Tenant
from app.services.storage import save_uploaded_file, range_requests_response

router = APIRouter(prefix="/media", tags=["media"])

@router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    url = await save_uploaded_file(file, current_tenant.id, is_video=False)
    return {"url": url, "filename": file.filename}

@router.post("/upload/video")
async def upload_video(
    file: UploadFile = File(...),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    url = await save_uploaded_file(file, current_tenant.id, is_video=True)
    return {"url": url, "filename": file.filename}

@router.get("/stream/{tenant_folder}/{subfolder}/{filename}")
async def stream_media(
    tenant_folder: str,
    subfolder: str,
    filename: str,
    range: str | None = Header(None)
):
    # Security check: prevent directory traversal
    if ".." in tenant_folder or ".." in subfolder or ".." in filename:
        raise HTTPException(status_code=400, detail="非法文件路径")
        
    target_path = settings.UPLOAD_DIR / tenant_folder / subfolder / filename
    return range_requests_response(target_path, range)
