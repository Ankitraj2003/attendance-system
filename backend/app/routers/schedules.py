from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WorkSchedule, Holiday, User
from app.schemas import WorkScheduleBase, WorkScheduleResponse
from app.auth import get_current_admin

router = APIRouter(prefix="/api/schedules", tags=["Schedules"])

class HolidayCreate(BaseModel):
    holiday_date: date
    description: str
    holiday_type: str = "NATIONAL"  # NATIONAL, REGIONAL, COMPANY

@router.get("", response_model=List[WorkScheduleResponse])
def get_schedules(db: Session = Depends(get_db)):
    return db.query(WorkSchedule).all()

@router.post("", response_model=WorkScheduleResponse)
def create_schedule(
    payload: WorkScheduleBase,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    existing = db.query(WorkSchedule).filter(WorkSchedule.schedule_name == payload.schedule_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Schedule with this name already exists")
    sched = WorkSchedule(**payload.dict())
    db.add(sched)
    db.commit()
    db.refresh(sched)
    return sched

@router.get("/holidays")
def get_holidays(db: Session = Depends(get_db)):
    return db.query(Holiday).order_by(Holiday.holiday_date).all()

@router.post("/holidays")
def add_holiday(
    payload: HolidayCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    existing = db.query(Holiday).filter(Holiday.holiday_date == payload.holiday_date).first()
    if existing:
        raise HTTPException(status_code=400, detail="A holiday already exists on this date")
    h = Holiday(
        holiday_date=payload.holiday_date,
        description=payload.description,
        holiday_type=payload.holiday_type,
    )
    db.add(h)
    db.commit()
    db.refresh(h)
    return h

@router.delete("/holidays/{holiday_id}")
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    h = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Holiday not found")
    db.delete(h)
    db.commit()
    return {"message": "Holiday deleted"}
