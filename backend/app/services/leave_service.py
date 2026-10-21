import os
import uuid
import json
from datetime import datetime, date, timezone, timedelta
from typing import Optional, List, Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models import LeaveRequest, AttendanceAttachment, AttendanceRecord, Employee, User, AuditLog
from app.services.attendance_service import get_company_tz

ALLOWED_MIME_TYPES = {
    "application/pdf": [b"%PDF"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/jpg": [b"\xff\xd8\xff"],
}

def validate_and_save_attachment(
    file: UploadFile,
    employee_id: str
) -> Tuple[str, str, str, int]:
    # Check size
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attachment size exceeds maximum limit of {settings.MAX_FILE_SIZE_MB}MB"
        )
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attachment file cannot be empty"
        )

    # Magic byte inspection
    header = file.file.read(32)
    file.file.seek(0)

    matched = False
    detected_mime = None
    for mime, signatures in ALLOWED_MIME_TYPES.items():
        for sig in signatures:
            if header.startswith(sig):
                matched = True
                detected_mime = mime
                break
        if matched:
            break

    if not matched:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only PDF, JPG, and PNG documents are permitted."
        )

    # Generate secure random storage filename
    ext = os.path.splitext(file.filename or "")[1].lower()
    if not ext or ext not in [".pdf", ".jpg", ".jpeg", ".png"]:
        ext = ".pdf" if "pdf" in detected_mime else ".png"

    safe_name = f"{employee_id}_{uuid.uuid4().hex}{ext}"
    storage_dir = settings.STORAGE_DIR
    os.makedirs(storage_dir, exist_ok=True)
    target_path = os.path.join(storage_dir, safe_name)

    with open(target_path, "wb") as f:
        f.write(file.file.read())

    return file.filename, safe_name, detected_mime, size

class LeaveService:
    @staticmethod
    def create_leave_request(
        db: Session,
        employee: Employee,
        leave_type: str,
        start_date: date,
        end_date: date,
        reason: str,
        attachment_file: Optional[UploadFile] = None
    ) -> LeaveRequest:
        if end_date < start_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End date cannot be prior to start date."
            )

        if not attachment_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Supporting document is mandatory for all leave/absence requests."
            )

        # Save attachment safely
        orig_name, stored_name, mime_type, file_size = validate_and_save_attachment(
            attachment_file, employee.employee_id
        )

        leave_req = LeaveRequest(
            employee_id=employee.employee_id,
            leave_type=leave_type.upper(),
            start_date=start_date,
            end_date=end_date,
            reason=reason,
            status="PENDING"
        )
        db.add(leave_req)
        db.flush()

        attachment = AttendanceAttachment(
            leave_request_id=leave_req.id,
            employee_id=employee.employee_id,
            original_filename=orig_name,
            stored_filename=stored_name,
            mime_type=mime_type,
            file_size=file_size,
            storage_path=os.path.join(settings.STORAGE_DIR, stored_name)
        )
        db.add(attachment)

        # Mark corresponding dates as pending absence if single day or span
        curr = start_date
        while curr <= end_date:
            existing_rec = db.query(AttendanceRecord).filter(
                AttendanceRecord.employee_id == employee.employee_id,
                AttendanceRecord.attendance_date == curr
            ).first()
            if not existing_rec:
                att_record = AttendanceRecord(
                    employee_id=employee.employee_id,
                    attendance_date=curr,
                    attendance_classification="ABSENT",
                    day_type="FULL_DAY",
                    is_incomplete=False,
                    related_leave_id=leave_req.id
                )
                db.add(att_record)
            curr += timedelta(days=1)

        db.commit()
        db.refresh(leave_req)
        return leave_req

    @staticmethod
    def process_decision(
        db: Session,
        request_id: int,
        admin_user: User,
        status_choice: str,
        remarks: Optional[str] = None,
        rejection_reason: Optional[str] = None
    ) -> LeaveRequest:
        leave_req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).with_for_update().first()
        if not leave_req:
            raise HTTPException(status_code=404, detail="Leave request not found")

        if leave_req.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Leave request is already finalized as {leave_req.status}."
            )

        status_choice = status_choice.upper()
        if status_choice not in ["APPROVED", "REJECTED"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid decision status")

        now_utc = datetime.now(timezone.utc)
        leave_req.status = status_choice
        leave_req.reviewer_id = admin_user.id
        leave_req.review_timestamp = now_utc
        leave_req.decision_remarks = remarks
        leave_req.rejection_reason = rejection_reason if status_choice == "REJECTED" else None

        # Update affected attendance records
        curr = leave_req.start_date
        target_class = "ON_LEAVE" if status_choice == "APPROVED" else "ABSENT"
        while curr <= leave_req.end_date:
            rec = db.query(AttendanceRecord).filter(
                AttendanceRecord.employee_id == leave_req.employee_id,
                AttendanceRecord.attendance_date == curr
            ).first()
            if rec:
                rec.attendance_classification = target_class
                rec.related_leave_id = leave_req.id
            else:
                new_rec = AttendanceRecord(
                    employee_id=leave_req.employee_id,
                    attendance_date=curr,
                    attendance_classification=target_class,
                    related_leave_id=leave_req.id
                )
                db.add(new_rec)
            curr += timedelta(days=1)

        # Audit log
        audit = AuditLog(
            actor=admin_user.username,
            actor_role="ADMIN",
            action=f"LEAVE_{status_choice}",
            entity_type="LEAVE_REQUEST",
            entity_id=str(leave_req.id),
            before_values=json.dumps({"status": "PENDING"}),
            after_values=json.dumps({"status": status_choice, "remarks": remarks, "rejection": rejection_reason}),
            reason=remarks or rejection_reason or "Leave review decision"
        )
        db.add(audit)

        db.commit()
        db.refresh(leave_req)
        return leave_req
