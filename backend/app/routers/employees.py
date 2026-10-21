import secrets
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee, User, WorkSchedule, AttendanceRecord, LeaveRequest, AuditLog
from app.schemas import EmployeeCreate, EmployeeUpdate, EmployeeResponse
from app.auth import get_current_admin
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/api/employees", tags=["Employees"])

@router.get("", response_model=List[EmployeeResponse])
def list_employees(
    department: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = db.query(Employee)
    if department and department != "ALL":
        query = query.filter(Employee.department == department)
    if status_filter and status_filter != "ALL":
        query = query.filter(Employee.account_status == status_filter)
    return query.order_by(Employee.employee_id).all()

@router.post("", response_model=EmployeeResponse)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Check duplicate ID or email
    if db.query(Employee).filter(Employee.employee_id == payload.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already exists")
    if db.query(Employee).filter(Employee.work_email == payload.work_email).first():
        raise HTTPException(status_code=400, detail="Work email already registered")

    # Generate unique secure token for attendance link
    token_sec = secrets.token_urlsafe(32)

    emp = Employee(
        employee_id=payload.employee_id,
        employee_number=payload.employee_number,
        name=payload.name,
        work_email=payload.work_email,
        department=payload.department,
        designation=payload.designation,
        date_of_joining=payload.date_of_joining,
        employment_status=payload.employment_status,
        account_status="ACTIVE",
        token_secret=token_sec,
        weekly_off_days=payload.weekly_off_days,
        assigned_schedule_id=payload.assigned_schedule_id
    )
    db.add(emp)

    audit = AuditLog(
        actor=admin.username,
        actor_role="ADMIN",
        action="EMPLOYEE_CREATED",
        entity_type="EMPLOYEE",
        entity_id=payload.employee_id,
        reason=f"Registered employee {payload.name}"
    )
    db.add(audit)

    db.commit()
    db.refresh(emp)
    return emp

@router.put("/{employee_id}", response_model=EmployeeResponse)
def update_employee(
    employee_id: str,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(emp, field, val)

    audit = AuditLog(
        actor=admin.username,
        actor_role="ADMIN",
        action="EMPLOYEE_UPDATED",
        entity_type="EMPLOYEE",
        entity_id=employee_id,
        reason=f"Updated details for {emp.name}"
    )
    db.add(audit)

    db.commit()
    db.refresh(emp)
    return emp

@router.post("/{employee_id}/toggle-status")
def toggle_employee_status(
    employee_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    new_status = "INACTIVE" if emp.account_status == "ACTIVE" else "ACTIVE"
    emp.account_status = new_status

    audit = AuditLog(
        actor=admin.username,
        actor_role="ADMIN",
        action="EMPLOYEE_STATUS_CHANGE",
        entity_type="EMPLOYEE",
        entity_id=employee_id,
        reason=f"Changed account status to {new_status}"
    )
    db.add(audit)
    db.commit()

    return {"message": f"Employee {emp.name} is now {new_status}", "account_status": new_status}

@router.post("/{employee_id}/regenerate-token")
def regenerate_attendance_token(
    employee_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    new_token = secrets.token_urlsafe(32)
    emp.token_secret = new_token

    audit = AuditLog(
        actor=admin.username,
        actor_role="ADMIN",
        action="TOKEN_REVOKED_REGENERATED",
        entity_type="EMPLOYEE",
        entity_id=employee_id,
        reason="Revoked prior attendance token and generated a fresh link"
    )
    db.add(audit)
    db.commit()

    return {"message": "Attendance link regenerated successfully", "token_secret": new_token}

@router.get("/{employee_id}/dashboard")
def get_individual_employee_dashboard(
    employee_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin) # MANDATORY: STRICTLY ADMIN-ONLY
):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Default to past 30 days if no range specified
    end = end_date or date.today()
    start = start_date or (end - (date.today().replace(day=1) - date.today().replace(day=1))) # or 30 days
    if not start_date:
        start = end.replace(day=1) # start of current month

    # Attendance records
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == employee_id,
        AttendanceRecord.attendance_date >= start,
        AttendanceRecord.attendance_date <= end
    ).order_by(AttendanceRecord.attendance_date.desc()).all()

    present_days = sum(1 for r in records if r.attendance_classification in ["PRESENT", "HALF_DAY"])
    full_days = sum(1 for r in records if r.attendance_classification == "PRESENT" and r.day_type == "FULL_DAY")
    half_days = sum(1 for r in records if r.attendance_classification == "HALF_DAY" or r.day_type == "HALF_DAY")
    absence_days = sum(1 for r in records if r.attendance_classification in ["ABSENT", "ON_LEAVE"])
    late_arrivals = sum(1 for r in records if r.is_late)
    missing_checkouts = sum(1 for r in records if r.is_incomplete)

    hours_list = [r.recorded_working_duration for r in records if r.recorded_working_duration is not None and r.recorded_working_duration > 0]
    total_hours = round(sum(hours_list), 2)
    avg_hours = round(total_hours / len(hours_list), 2) if hours_list else 0.0

    # Leaves
    leaves = db.query(LeaveRequest).filter(
        LeaveRequest.employee_id == employee_id,
        LeaveRequest.start_date <= end,
        LeaveRequest.end_date >= start
    ).order_by(LeaveRequest.created_at.desc()).all()

    pl_count = sum(1 for l in leaves if l.leave_type == "PL")
    cl_count = sum(1 for l in leaves if l.leave_type == "CL")
    med_count = sum(1 for l in leaves if l.leave_type == "MEDICAL")
    approved_leaves = sum(1 for l in leaves if l.status == "APPROVED")
    pending_leaves = sum(1 for l in leaves if l.status == "PENDING")
    rejected_leaves = sum(1 for l in leaves if l.status == "REJECTED")

    # Calendar data for current month
    calendar_days = AnalyticsService.get_employee_monthly_calendar(
        db=db,
        employee_id=employee_id,
        year=end.year,
        month=end.month
    )

    return {
        "profile": {
            "employee_id": emp.employee_id,
            "employee_number": emp.employee_number,
            "name": emp.name,
            "work_email": emp.work_email,
            "department": emp.department,
            "designation": emp.designation,
            "date_of_joining": emp.date_of_joining,
            "employment_status": emp.employment_status,
            "account_status": emp.account_status,
            "weekly_off_days": emp.weekly_off_days,
            "schedule": emp.schedule.schedule_name if emp.schedule else "Standard Shift"
        },
        "kpis": {
            "recorded_present_days": present_days,
            "full_days": full_days,
            "half_days": half_days,
            "absence_records": absence_days,
            "pl_requests": pl_count,
            "cl_requests": cl_count,
            "medical_requests": med_count,
            "approved_leaves": approved_leaves,
            "pending_leaves": pending_leaves,
            "rejected_leaves": rejected_leaves,
            "total_working_hours": total_hours,
            "average_daily_working_hours": avg_hours,
            "late_arrivals": late_arrivals,
            "missing_check_outs": missing_checkouts
        },
        "attendance_history": [
            {
                "id": r.id,
                "date": r.attendance_date.isoformat(),
                "status": r.attendance_classification,
                "day_type": r.day_type,
                "check_in": r.check_in_timestamp.isoformat() if r.check_in_timestamp else None,
                "check_out": r.check_out_timestamp.isoformat() if r.check_out_timestamp else None,
                "duration": r.recorded_working_duration,
                "is_late": r.is_late,
                "is_early_departure": r.is_early_departure,
                "is_incomplete": r.is_incomplete,
                "is_manually_corrected": r.is_manually_corrected,
                "correction_reason": r.correction_reason
            }
            for r in records
        ],
        "leave_history": [
            {
                "id": l.id,
                "leave_type": l.leave_type,
                "start_date": l.start_date.isoformat(),
                "end_date": l.end_date.isoformat(),
                "status": l.status,
                "reason": l.reason,
                "remarks": l.decision_remarks or l.rejection_reason,
                "submitted_at": l.created_at.isoformat(),
                "attachments": [
                    {
                        "id": a.id,
                        "filename": a.original_filename,
                        "size": a.file_size
                    }
                    for a in l.attachments
                ]
            }
            for l in leaves
        ],
        "calendar": calendar_days
    }
