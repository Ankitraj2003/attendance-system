from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Employee
from app.auth import get_current_admin
from app.services.export_service import ExportService
from app.services.attendance_service import get_current_company_date_and_time

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/company/excel")
def download_company_excel(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    curr_d, _ = get_current_company_date_and_time()
    end = end_date or curr_d
    start = start_date or (end.replace(day=1))

    buffer = ExportService.generate_company_excel(
        db=db,
        start_date=start,
        end_date=end,
        department=department
    )

    filename = f"Expandit_Attendance_Report_{start.isoformat()}_to_{end.isoformat()}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/company/csv")
def download_company_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    curr_d, _ = get_current_company_date_and_time()
    end = end_date or curr_d
    start = start_date or (end.replace(day=1))

    csv_content = ExportService.generate_csv_attendance(
        db=db,
        start_date=start,
        end_date=end,
        department=department
    )

    filename = f"Expandit_Attendance_{start.isoformat()}_to_{end.isoformat()}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/employee/{employee_id}/excel")
def download_employee_excel(
    employee_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    curr_d, _ = get_current_company_date_and_time()
    end = end_date or curr_d
    start = start_date or (end.replace(day=1))

    buffer = ExportService.generate_single_employee_excel(
        db=db,
        employee_id=employee_id,
        start_date=start,
        end_date=end
    )

    filename = f"Expandit_Attendance_{employee_id}_{start.isoformat()}_to_{end.isoformat()}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/employee/{employee_id}/csv")
def download_employee_csv(
    employee_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    curr_d, _ = get_current_company_date_and_time()
    end = end_date or curr_d
    start = start_date or (end.replace(day=1))

    csv_content = ExportService.generate_csv_attendance(
        db=db,
        start_date=start,
        end_date=end,
        employee_id=employee_id
    )

    filename = f"Expandit_Attendance_{employee_id}_{start.isoformat()}_to_{end.isoformat()}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
