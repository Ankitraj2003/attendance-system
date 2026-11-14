import os
import re
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AttendanceAttachment, User
from app.auth import get_current_admin
from app.config import settings

router = APIRouter(prefix="/api/attachments", tags=["Attachments"])

@router.get("/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    attachment = db.query(AttendanceAttachment).filter(AttendanceAttachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment record not found")

    storage_root = os.path.abspath(settings.STORAGE_DIR)
    file_path = os.path.abspath(attachment.storage_path)

    # Ensure path traversal cannot escape the configured storage directory
    if not file_path.startswith(storage_root) or not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Physical document not found on server")

    # Sanitize download filename for Content-Disposition header against CR/LF and quotes
    safe_filename = re.sub(r'[\r\n"]', '_', attachment.original_filename or f"attachment_{attachment_id}")

    return FileResponse(
        path=file_path,
        media_type=attachment.mime_type or "application/octet-stream",
        filename=safe_filename,
        content_disposition_type="inline",
    )
