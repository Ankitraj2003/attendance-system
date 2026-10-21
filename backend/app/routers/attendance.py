from datetime import datetime, date, timezone
import calendar
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.models import AttendanceRecord, Employee, User, Holiday
from app.schemas import (
    CheckInRequest, CheckOutRequest, ManualCorrectionRequest, 
    AttendanceRecordResponse, EmployeePortalInfo
)
from app.auth import get_employee_by_token, get_current_admin
from app.services.attendance_service import (
    AttendanceService, get_current_company_date_and_time, get_company_tz
)
from app.services.event_service import broadcaster

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

@router.get("/portal/{token}", response_model=EmployeePortalInfo)
def get_portal_info(token: str, db: Session = Depends(get_db)):
    employee = get_employee_by_token(token, db)
    curr_date, _ = get_current_company_date_and_time()
    tz = get_company_tz()

    # 1. Holiday check for today
    holiday = db.query(Holiday).filter(Holiday.holiday_date == curr_date).first()
    is_holiday = holiday is not None
    holiday_name = holiday.description if holiday else None

    # 2. Weekly off check for today (Saturday & Sunday default)
    weekly_offs = [w.strip().lower() for w in (employee.weekly_off_days or "Saturday,Sunday").split(",") if w.strip()]
    day_name = curr_date.strftime("%A")
    is_weekly_off = day_name.lower() in weekly_offs
    off_day_name = day_name if is_weekly_off else None

    # 3. Today's attendance record (if employee checked in or requested leave)
    today_rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == employee.employee_id,
        AttendanceRecord.attendance_date == curr_date
    ).first()

    today_dict = None
    if today_rec:
        cin = today_rec.check_in_timestamp.astimezone(tz).strftime("%I:%M %p") if today_rec.check_in_timestamp else None
        cout = today_rec.check_out_timestamp.astimezone(tz).strftime("%I:%M %p") if today_rec.check_out_timestamp else None
        today_dict = {
            "id": today_rec.id,
            "status": today_rec.attendance_classification,
            "day_type": today_rec.day_type,
            "check_in": cin,
            "check_out": cout,
            "is_checked_in": bool(today_rec.check_in_timestamp),
            "is_checked_out": bool(today_rec.check_out_timestamp),
            "duration": today_rec.recorded_working_duration,
            "is_late": today_rec.is_late
        }
    else:
        if is_holiday:
            today_dict = {
                "status": "HOLIDAY",
                "is_checked_in": False,
                "is_checked_out": False,
                "description": f"Company Holiday: {holiday_name}"
            }
        elif is_weekly_off:
            today_dict = {
                "status": "WEEKLY_OFF",
                "is_checked_in": False,
                "is_checked_out": False,
                "description": f"Weekly Off ({off_day_name})"
            }

    # 4. Fetch 1-month records (entire current month up to today)
    first_day_of_month = curr_date.replace(day=1)
    month_recs = db.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == employee.employee_id,
        AttendanceRecord.attendance_date >= first_day_of_month,
        AttendanceRecord.attendance_date <= curr_date
    ).order_by(AttendanceRecord.attendance_date.desc()).all()

    # Also keep a 7-day slice
    recent_recs = month_recs[:7] if len(month_recs) >= 7 else db.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == employee.employee_id
    ).order_by(AttendanceRecord.attendance_date.desc()).limit(7).all()

    def _fmt_recs(records):
        out = []
        for r in records:
            cin_s = r.check_in_timestamp.astimezone(tz).strftime("%I:%M %p") if r.check_in_timestamp else "-"
            cout_s = r.check_out_timestamp.astimezone(tz).strftime("%I:%M %p") if r.check_out_timestamp else "-"
            out.append({
                "date": r.attendance_date.isoformat(),
                "status": r.attendance_classification,
                "check_in": cin_s,
                "check_out": cout_s,
                "duration": r.recorded_working_duration or 0.0
            })
        return out

    recent_list = _fmt_recs(recent_recs)
    month_list = _fmt_recs(month_recs)

    # 5. Monthly hours calculation & dynamic target
    monthly_hours_worked = sum((r.recorded_working_duration or 0.0) for r in month_recs)
    monthly_hours_worked = round(monthly_hours_worked, 1)

    # Dynamic target: working_days = total_days - weekends - company holidays this month
    year, month = curr_date.year, curr_date.month
    total_days = calendar.monthrange(year, month)[1]
    weekly_off_names = [w.strip().lower() for w in (employee.weekly_off_days or "Saturday,Sunday").split(",") if w.strip()]
    off_days_count = sum(
        1 for d in range(1, total_days + 1)
        if date(year, month, d).strftime("%A").lower() in weekly_off_names
    )
    month_holidays_count = db.query(Holiday).filter(
        Holiday.holiday_date >= date(year, month, 1),
        Holiday.holiday_date <= date(year, month, total_days)
    ).count()
    working_days = total_days - off_days_count - month_holidays_count
    target_hours = round(working_days * 8.0, 1)

    has_achievement_badge = monthly_hours_worked >= target_hours and monthly_hours_worked > 0
    achievement_title = (
        f"Star Achiever: {monthly_hours_worked}/{target_hours} hrs Target Met!"
        if has_achievement_badge else None
    )

    sched = employee.schedule
    sched_name = sched.schedule_name if sched else "Standard Corporate Shift"
    start_t = sched.start_time if sched else "10:00"
    end_t = sched.end_time if sched else "19:00"

    return {
        "employee_id": employee.employee_id,
        "name": employee.name,
        "department": employee.department,
        "designation": employee.designation,
        "date_of_joining": employee.date_of_joining,
        "current_date": curr_date,
        "server_time": datetime.now(tz).strftime("%I:%M:%S %p"),
        "assigned_schedule": sched_name,
        "schedule_start": start_t,
        "schedule_end": end_t,
        "is_holiday": is_holiday,
        "holiday_name": holiday_name,
        "is_weekly_off": is_weekly_off,
        "off_day_name": off_day_name,
        "monthly_hours_worked": monthly_hours_worked,
        "monthly_target_hours": target_hours,
        "has_achievement_badge": has_achievement_badge,
        "achievement_title": achievement_title,
        "today_record": today_dict,
        "recent_records": recent_list,
        "month_records": month_list
    }

@router.post("/portal/{token}/check-in")
async def portal_check_in(
    token: str, 
    payload: CheckInRequest, 
    db: Session = Depends(get_db)
):
    employee = get_employee_by_token(token, db)
    record = AttendanceService.process_check_in(db, employee, payload.day_type)
    
    # Broadcast event to listening admin dashboards
    await broadcaster.broadcast("CHECK_IN", {
        "employee_id": employee.employee_id,
        "name": employee.name,
        "department": employee.department,
        "time": record.check_in_timestamp.isoformat() if record.check_in_timestamp else None,
        "is_late": record.is_late
    })

    return {
        "message": "Check-in successful",
        "employee_id": employee.employee_id,
        "name": employee.name,
        "check_in_time": record.check_in_timestamp,
        "is_late": record.is_late,
        "status": record.attendance_classification
    }

@router.post("/portal/{token}/check-out")
async def portal_check_out(
    token: str, 
    payload: CheckOutRequest, 
    db: Session = Depends(get_db)
):
    employee = get_employee_by_token(token, db)
    record = AttendanceService.process_check_out(db, employee)

    await broadcaster.broadcast("CHECK_OUT", {
        "employee_id": employee.employee_id,
        "name": employee.name,
        "department": employee.department,
        "time": record.check_out_timestamp.isoformat() if record.check_out_timestamp else None,
        "duration": record.recorded_working_duration
    })

    return {
        "message": "Check-out successful",
        "employee_id": employee.employee_id,
        "name": employee.name,
        "check_out_time": record.check_out_timestamp,
        "recorded_working_duration": record.recorded_working_duration,
        "is_early_departure": record.is_early_departure
    }

@router.get("/records")
def list_attendance_records(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    employee_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    missing_checkout: Optional[bool] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = db.query(AttendanceRecord, Employee).join(
        Employee, AttendanceRecord.employee_id == Employee.employee_id
    )

    if start_date:
        query = query.filter(AttendanceRecord.attendance_date >= start_date)
    if end_date:
        query = query.filter(AttendanceRecord.attendance_date <= end_date)
    if department and department != "ALL":
        query = query.filter(Employee.department == department)
    if employee_id:
        query = query.filter(AttendanceRecord.employee_id == employee_id)
    if status_filter and status_filter != "ALL":
        query = query.filter(AttendanceRecord.attendance_classification == status_filter)
    if missing_checkout is True:
        curr_d, _ = get_current_company_date_and_time()
        query = query.filter(
            AttendanceRecord.check_in_timestamp.isnot(None),
            AttendanceRecord.check_out_timestamp.is_(None)
        )
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                Employee.name.ilike(search_fmt),
                Employee.employee_id.ilike(search_fmt),
                Employee.department.ilike(search_fmt)
            )
        )

    total_count = query.count()
    records = query.order_by(AttendanceRecord.attendance_date.desc(), AttendanceRecord.id.desc()).offset((page - 1) * limit).limit(limit).all()

    items = []
    for r, emp in records:
        items.append({
            "id": r.id,
            "employee_id": emp.employee_id,
            "employee_name": emp.name,
            "department": emp.department,
            "attendance_date": r.attendance_date,
            "attendance_classification": r.attendance_classification,
            "day_type": r.day_type,
            "check_in_timestamp": r.check_in_timestamp,
            "check_out_timestamp": r.check_out_timestamp,
            "recorded_working_duration": r.recorded_working_duration,
            "is_late": r.is_late,
            "is_early_departure": r.is_early_departure,
            "is_incomplete": r.is_incomplete,
            "is_manually_corrected": r.is_manually_corrected,
            "correction_reason": r.correction_reason,
            "related_leave_id": r.related_leave_id
        })

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit
    }

@router.post("/records/{record_id}/correct")
async def manual_correction(
    record_id: int,
    payload: ManualCorrectionRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    corrected = AttendanceService.manual_correction(
        db=db,
        record_id=record_id,
        admin_actor=admin.username,
        user_id=admin.id,
        classification=payload.attendance_classification,
        day_type=payload.day_type,
        check_in=payload.check_in_timestamp,
        check_out=payload.check_out_timestamp,
        reason=payload.reason
    )

    await broadcaster.broadcast("RECORD_CORRECTED", {
        "record_id": corrected.id,
        "employee_id": corrected.employee_id,
        "admin": admin.username
    })

    return {
        "message": "Record corrected successfully and audit trail logged",
        "record_id": corrected.id
    }
