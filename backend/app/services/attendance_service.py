from datetime import datetime, date, time, timezone, timedelta
from typing import Optional, Tuple, Dict, Any
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import json

from app.config import settings
from app.models import AttendanceRecord, Employee, WorkSchedule, AuditLog, Notification
from app.services.event_service import broadcaster

def get_company_tz() -> ZoneInfo:
    try:
        return ZoneInfo(settings.COMPANY_TIMEZONE)
    except Exception:
        return ZoneInfo("Asia/Kolkata")

def get_current_company_date_and_time() -> Tuple[date, datetime]:
    tz = get_company_tz()
    local_now = datetime.now(tz)
    return local_now.date(), datetime.now(timezone.utc)

def calculate_working_hours(check_in: datetime, check_out: datetime) -> float:
    if not check_in or not check_out or check_out <= check_in:
        return 0.0
    diff = check_out - check_in
    return round(diff.total_seconds() / 3600.0, 2)

def check_lateness(check_in_local: datetime, schedule: Optional[WorkSchedule]) -> bool:
    if not schedule or not schedule.start_time:
        return False
    try:
        sched_h, sched_m = map(int, schedule.start_time.split(":")[:2])
        sched_time = time(sched_h, sched_m)
        sched_dt = datetime.combine(check_in_local.date(), sched_time, tzinfo=check_in_local.tzinfo)
        grace_limit = sched_dt + timedelta(minutes=schedule.late_arrival_threshold_minutes)
        return check_in_local > grace_limit
    except Exception:
        return False

def check_early_departure(check_out_local: datetime, schedule: Optional[WorkSchedule]) -> bool:
    if not schedule or not schedule.end_time:
        return False
    try:
        sched_h, sched_m = map(int, schedule.end_time.split(":")[:2])
        sched_time = time(sched_h, sched_m)
        sched_dt = datetime.combine(check_out_local.date(), sched_time, tzinfo=check_out_local.tzinfo)
        return check_out_local < sched_dt
    except Exception:
        return False

class AttendanceService:
    @staticmethod
    def process_check_in(
        db: Session, 
        employee: Employee, 
        day_type: str = "FULL_DAY"
    ) -> AttendanceRecord:
        current_date, now_utc = get_current_company_date_and_time()
        tz = get_company_tz()
        local_now = datetime.now(tz)

        # Check if record already exists for today
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id == employee.employee_id,
            AttendanceRecord.attendance_date == current_date
        ).with_for_update().first()

        if existing:
            # If already checked in or on leave, return existing without duplicating
            if existing.attendance_classification in ["ABSENT", "ON_LEAVE"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Attendance already marked as {existing.attendance_classification} for today. Administrative review required."
                )
            if existing.check_in_timestamp:
                # Idempotent response: return existing record
                return existing

        schedule = employee.schedule
        is_late = check_lateness(local_now, schedule)

        if not existing:
            classification = "PRESENT" if day_type == "FULL_DAY" else "HALF_DAY"
            record = AttendanceRecord(
                employee_id=employee.employee_id,
                attendance_date=current_date,
                attendance_classification=classification,
                day_type=day_type,
                check_in_timestamp=now_utc,
                check_out_timestamp=None,
                recorded_working_duration=None,
                is_late=is_late,
                is_early_departure=False,
                is_incomplete=True,
                schedule_id=schedule.id if schedule else None
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            return record
        else:
            existing.check_in_timestamp = now_utc
            existing.is_late = is_late
            existing.is_incomplete = True
            existing.day_type = day_type
            db.commit()
            db.refresh(existing)
            return existing

    @staticmethod
    def process_check_out(db: Session, employee: Employee) -> AttendanceRecord:
        current_date, now_utc = get_current_company_date_and_time()
        tz = get_company_tz()
        local_now = datetime.now(tz)

        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id == employee.employee_id,
            AttendanceRecord.attendance_date == current_date
        ).with_for_update().first()

        if not record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No check-in record found for today. Check-in is required before checking out."
            )

        if record.attendance_classification in ["ABSENT", "ON_LEAVE"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot check out on an absent/leave record."
            )

        if not record.check_in_timestamp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Check-in timestamp is missing. Please contact your administrator."
            )

        # Idempotency: If already checked out, do not overwrite timestamp!
        if record.check_out_timestamp is not None:
            return record

        # Perform checkout
        record.check_out_timestamp = now_utc
        duration = calculate_working_hours(record.check_in_timestamp, now_utc)
        record.recorded_working_duration = duration
        record.is_early_departure = check_early_departure(local_now, employee.schedule)
        record.is_incomplete = False

        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def add_manual_attendance(
        db: Session,
        employee_id: str,
        attendance_date: date,
        classification: str,
        day_type: str,
        check_in_time: Optional[str],
        check_out_time: Optional[str],
        reason: str,
        admin_actor: str,
        user_id: int
    ) -> AttendanceRecord:
        emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")

        tz = get_company_tz()
        check_in_dt = None
        check_out_dt = None

        if check_in_time and ":" in check_in_time:
            h, m = map(int, check_in_time.split(":")[:2])
            check_in_dt = datetime(attendance_date.year, attendance_date.month, attendance_date.day, h, m, tzinfo=tz)

        if check_out_time and ":" in check_out_time:
            h, m = map(int, check_out_time.split(":")[:2])
            check_out_dt = datetime(attendance_date.year, attendance_date.month, attendance_date.day, h, m, tzinfo=tz)

        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.attendance_date == attendance_date
        ).first()

        duration = 0.0
        if check_in_dt and check_out_dt:
            duration = calculate_working_hours(check_in_dt, check_out_dt)

        is_late = check_lateness(check_in_dt, emp.schedule) if check_in_dt else False

        if record:
            record.attendance_classification = classification
            record.day_type = day_type
            if check_in_dt:
                record.check_in_timestamp = check_in_dt
            if check_out_dt:
                record.check_out_timestamp = check_out_dt
            if check_in_dt and check_out_dt:
                record.recorded_working_duration = duration
            record.is_late = is_late
            record.is_incomplete = bool(record.check_in_timestamp and not record.check_out_timestamp)
            record.is_manually_corrected = True
            record.correction_reason = reason
            record.corrected_by_user_id = user_id
        else:
            record = AttendanceRecord(
                employee_id=employee_id,
                attendance_date=attendance_date,
                attendance_classification=classification,
                day_type=day_type,
                check_in_timestamp=check_in_dt,
                check_out_timestamp=check_out_dt,
                recorded_working_duration=duration,
                is_late=is_late,
                is_incomplete=bool(check_in_dt and not check_out_dt),
                is_manually_corrected=True,
                correction_reason=reason,
                corrected_by_user_id=user_id
            )
            db.add(record)

        audit = AuditLog(
            actor=admin_actor,
            actor_role="ADMIN",
            action="MANUAL_ATTENDANCE_ENTRY",
            entity_type="ATTENDANCE_RECORD",
            entity_id=f"{employee_id}_{attendance_date}",
            after_values=json.dumps({
                "employee_id": employee_id,
                "date": attendance_date.isoformat(),
                "status": classification,
                "duration": duration
            }),
            reason=reason
        )
        db.add(audit)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_today_status(db: Session, employee_id: str) -> Optional[AttendanceRecord]:
        current_date, _ = get_current_company_date_and_time()
        return db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.attendance_date == current_date
        ).first()

    @staticmethod
    def manual_correction(
        db: Session,
        record_id: int,
        admin_actor: str,
        user_id: int,
        classification: Optional[str],
        day_type: Optional[str],
        check_in: Optional[datetime],
        check_out: Optional[datetime],
        reason: str,
        ip: Optional[str] = None
    ) -> AttendanceRecord:
        record = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).with_for_update().first()
        if not record:
            raise HTTPException(status_code=404, detail="Attendance record not found")

        before_state = {
            "classification": record.attendance_classification,
            "day_type": record.day_type,
            "check_in": record.check_in_timestamp.isoformat() if record.check_in_timestamp else None,
            "check_out": record.check_out_timestamp.isoformat() if record.check_out_timestamp else None,
            "duration": record.recorded_working_duration,
        }

        if classification:
            record.attendance_classification = classification
        if day_type:
            record.day_type = day_type
        if check_in is not None:
            record.check_in_timestamp = check_in
        if check_out is not None:
            record.check_out_timestamp = check_out

        if record.check_in_timestamp and record.check_out_timestamp:
            record.recorded_working_duration = calculate_working_hours(
                record.check_in_timestamp, record.check_out_timestamp
            )
            record.is_incomplete = False
        else:
            record.is_incomplete = bool(record.check_in_timestamp and not record.check_out_timestamp)

        record.is_manually_corrected = True
        record.correction_reason = reason
        record.corrected_by_user_id = user_id

        after_state = {
            "classification": record.attendance_classification,
            "day_type": record.day_type,
            "check_in": record.check_in_timestamp.isoformat() if record.check_in_timestamp else None,
            "check_out": record.check_out_timestamp.isoformat() if record.check_out_timestamp else None,
            "duration": record.recorded_working_duration,
        }

        # Log audit trail
        audit = AuditLog(
            actor=admin_actor,
            actor_role="ADMIN",
            action="ATTENDANCE_CORRECTION",
            entity_type="ATTENDANCE_RECORD",
            entity_id=str(record.id),
            before_values=json.dumps(before_state),
            after_values=json.dumps(after_state),
            reason=reason,
            ip_address=ip
        )
        db.add(audit)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def add_manual_attendance(
        db: Session,
        employee_id: str,
        attendance_date: date,
        classification: str,
        day_type: str,
        check_in_time: Optional[str],
        check_out_time: Optional[str],
        reason: str,
        admin_actor: str,
        user_id: int
    ) -> AttendanceRecord:
        emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not found")

        tz = get_company_tz()
        check_in_dt = None
        check_out_dt = None

        if check_in_time and ":" in check_in_time:
            h, m = map(int, check_in_time.split(":")[:2])
            check_in_dt = datetime(attendance_date.year, attendance_date.month, attendance_date.day, h, m, tzinfo=tz)

        if check_out_time and ":" in check_out_time:
            h, m = map(int, check_out_time.split(":")[:2])
            check_out_dt = datetime(attendance_date.year, attendance_date.month, attendance_date.day, h, m, tzinfo=tz)

        record = db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.attendance_date == attendance_date
        ).first()

        duration = 0.0
        if check_in_dt and check_out_dt:
            duration = calculate_working_hours(check_in_dt, check_out_dt)

        is_late = check_lateness(check_in_dt, emp.schedule) if check_in_dt else False

        if record:
            record.attendance_classification = classification
            record.day_type = day_type
            if check_in_dt:
                record.check_in_timestamp = check_in_dt
            if check_out_dt:
                record.check_out_timestamp = check_out_dt
            if check_in_dt and check_out_dt:
                record.recorded_working_duration = duration
            record.is_late = is_late
            record.is_incomplete = bool(record.check_in_timestamp and not record.check_out_timestamp)
            record.is_manually_corrected = True
            record.correction_reason = reason
            record.corrected_by_user_id = user_id
        else:
            record = AttendanceRecord(
                employee_id=employee_id,
                attendance_date=attendance_date,
                attendance_classification=classification,
                day_type=day_type,
                check_in_timestamp=check_in_dt,
                check_out_timestamp=check_out_dt,
                recorded_working_duration=duration,
                is_late=is_late,
                is_incomplete=bool(check_in_dt and not check_out_dt),
                is_manually_corrected=True,
                correction_reason=reason,
                corrected_by_user_id=user_id
            )
            db.add(record)

        audit = AuditLog(
            actor=admin_actor,
            actor_role="ADMIN",
            action="MANUAL_ATTENDANCE_ENTRY",
            entity_type="ATTENDANCE_RECORD",
            entity_id=f"{employee_id}_{attendance_date}",
            after_values=json.dumps({
                "employee_id": employee_id,
                "date": attendance_date.isoformat(),
                "status": classification,
                "duration": duration
            }),
            reason=reason
        )
        db.add(audit)
        db.commit()
        db.refresh(record)
        return record
