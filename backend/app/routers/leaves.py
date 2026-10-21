from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LeaveRequest, Employee, User, AttendanceAttachment
from app.schemas import LeaveDecisionRequest
from app.auth import get_employee_by_token, get_current_admin
from app.services.leave_service import LeaveService
from app.services.event_service import broadcaster

router = APIRouter(prefix="/api/leaves", tags=["Leaves"])

@router.post("/portal/{token}/submit")
async def submit_leave(
    token: str,
    leave_type: str = Form(...),
    start_date: date = Form(...),
    end_date: date = Form(...),
    reason: str = Form(...),
    document: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    employee = get_employee_by_token(token, db)
    leave_req = LeaveService.create_leave_request(
        db=db,
        employee=employee,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        attachment_file=document
    )

    await broadcaster.broadcast("LEAVE_REQUEST_SUBMITTED", {
        "request_id": leave_req.id,
        "employee_id": employee.employee_id,
        "name": employee.name,
        "leave_type": leave_req.leave_type
    })

    return {
        "message": "Leave request submitted successfully with status Pending",
        "request_id": leave_req.id,
        "status": leave_req.status
    }

@router.get("")
def list_leaves(
    status_filter: Optional[str] = None,
    department: Optional[str] = None,
    employee_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = db.query(LeaveRequest, Employee).join(
        Employee, LeaveRequest.employee_id == Employee.employee_id
    )

    if status_filter and status_filter != "ALL":
        query = query.filter(LeaveRequest.status == status_filter)
    if department and department != "ALL":
        query = query.filter(Employee.department == department)
    if employee_id:
        query = query.filter(LeaveRequest.employee_id == employee_id)
    if start_date:
        query = query.filter(LeaveRequest.start_date >= start_date)
    if end_date:
        query = query.filter(LeaveRequest.end_date <= end_date)

    items = []
    for l_req, emp in query.order_by(LeaveRequest.created_at.desc()).all():
        attachments = [
            {
                "id": att.id,
                "original_filename": att.original_filename,
                "file_size": att.file_size,
                "mime_type": att.mime_type
            }
            for att in l_req.attachments
        ]
        items.append({
            "id": l_req.id,
            "employee_id": emp.employee_id,
            "employee_name": emp.name,
            "department": emp.department,
            "leave_type": l_req.leave_type,
            "start_date": l_req.start_date,
            "end_date": l_req.end_date,
            "reason": l_req.reason,
            "status": l_req.status,
            "decision_remarks": l_req.decision_remarks,
            "rejection_reason": l_req.rejection_reason,
            "created_at": l_req.created_at,
            "attachments": attachments
        })

    return items

@router.post("/{request_id}/decision")
async def process_leave_decision(
    request_id: int,
    payload: LeaveDecisionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    leave_req = LeaveService.process_decision(
        db=db,
        request_id=request_id,
        admin_user=admin,
        status_choice=payload.status,
        remarks=payload.decision_remarks,
        rejection_reason=payload.rejection_reason
    )

    await broadcaster.broadcast("LEAVE_DECISION", {
        "request_id": leave_req.id,
        "employee_id": leave_req.employee_id,
        "status": leave_req.status
    })

    return {
        "message": f"Leave request marked as {leave_req.status}",
        "request_id": leave_req.id,
        "status": leave_req.status
    }
