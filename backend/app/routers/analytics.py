from datetime import date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, AttendanceRecord, Employee, AuditLog
from app.schemas import KPICardData, AuditLogResponse
from app.auth import get_current_admin
from app.services.analytics_service import AnalyticsService
from app.services.attendance_service import get_current_company_date_and_time

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/kpis", response_model=KPICardData)
def get_kpis(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return AnalyticsService.get_dashboard_kpis(
        db=db,
        start_date=start_date,
        end_date=end_date,
        department=department
    )

@router.get("/distribution")
def get_distribution(
    target_date: Optional[date] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return AnalyticsService.get_attendance_distribution(
        db=db,
        target_date=target_date,
        department=department
    )

@router.get("/trends")
def get_trends(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    interval: str = Query("daily", pattern="^(daily|weekly|monthly)$"),
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    curr_d, _ = get_current_company_date_and_time()
    end = end_date or curr_d
    start = start_date or (end - timedelta(days=14))

    return AnalyticsService.get_attendance_trends(
        db=db,
        start_date=start,
        end_date=end,
        interval=interval,
        department=department
    )

@router.get("/departments")
def get_department_analysis(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    curr_d, _ = get_current_company_date_and_time()
    end = end_date or curr_d
    start = start_date or (end - timedelta(days=30))

    return AnalyticsService.get_department_analytics(
        db=db,
        start_date=start,
        end_date=end
    )

@router.get("/leaves")
def get_leave_analysis(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    curr_d, _ = get_current_company_date_and_time()
    end = end_date or curr_d
    start = start_date or (end - timedelta(days=30))

    return AnalyticsService.get_leave_distribution(
        db=db,
        start_date=start,
        end_date=end,
        department=department
    )

@router.get("/ranking")
def get_ranking(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    curr_d, _ = get_current_company_date_and_time()
    end = end_date or curr_d
    start = start_date or (end - timedelta(days=30))

    return AnalyticsService.get_employee_ranking(
        db=db,
        start_date=start,
        end_date=end,
        department=department
    )

@router.get("/exceptions")
def get_exceptions(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    curr_d, _ = get_current_company_date_and_time()

    missing_checkouts = db.query(AttendanceRecord, Employee).join(
        Employee, AttendanceRecord.employee_id == Employee.employee_id
    ).filter(
        AttendanceRecord.check_in_timestamp.isnot(None),
        AttendanceRecord.check_out_timestamp.is_(None),
        AttendanceRecord.attendance_date < curr_d
    ).order_by(AttendanceRecord.attendance_date.desc()).limit(20).all()

    late_arrivals = db.query(AttendanceRecord, Employee).join(
        Employee, AttendanceRecord.employee_id == Employee.employee_id
    ).filter(
        AttendanceRecord.is_late.is_(True)
    ).order_by(AttendanceRecord.attendance_date.desc()).limit(20).all()

    corrections = db.query(AttendanceRecord, Employee).join(
        Employee, AttendanceRecord.employee_id == Employee.employee_id
    ).filter(
        AttendanceRecord.is_manually_corrected.is_(True)
    ).order_by(AttendanceRecord.updated_at.desc()).limit(20).all()

    return {
        "missing_checkouts": [
            {
                "id": r.id,
                "employee_id": emp.employee_id,
                "name": emp.name,
                "department": emp.department,
                "date": r.attendance_date.isoformat(),
                "check_in": r.check_in_timestamp.isoformat() if r.check_in_timestamp else None
            }
            for r, emp in missing_checkouts
        ],
        "late_arrivals": [
            {
                "id": r.id,
                "employee_id": emp.employee_id,
                "name": emp.name,
                "department": emp.department,
                "date": r.attendance_date.isoformat(),
                "check_in": r.check_in_timestamp.isoformat() if r.check_in_timestamp else None
            }
            for r, emp in late_arrivals
        ],
        "manual_corrections": [
            {
                "id": r.id,
                "employee_id": emp.employee_id,
                "name": emp.name,
                "date": r.attendance_date.isoformat(),
                "reason": r.correction_reason
            }
            for r, emp in corrections
        ]
    }

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
