from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WorkSchedule, Holiday, User
from app.schemas import WorkScheduleBase, WorkScheduleResponse
from app.auth import get_current_admin

router = APIRouter(prefix="/api/schedules", tags=["Schedules"])

@router.get("", response_model=List[WorkScheduleResponse])
def get_schedules(db: Session = Depends(get_db)):
    return db.query(WorkSchedule).all()

@router.post("", response_model=WorkScheduleResponse)
def create_schedule(
    payload: WorkScheduleBase,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
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
