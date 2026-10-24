import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AttendanceAttachment, User
from app.auth import get_current_admin

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

    if not os.path.exists(attachment.storage_path):
        raise HTTPException(status_code=404, detail="Physical document not found on server")

    return FileResponse(
        path=attachment.storage_path,
        media_type=attachment.mime_type or "application/octet-stream",
        filename=attachment.original_filename,
        content_disposition_type="inline",
    )
