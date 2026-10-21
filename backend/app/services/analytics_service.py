from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case

from app.models import AttendanceRecord, Employee, LeaveRequest, WorkSchedule, Holiday
from app.services.attendance_service import get_company_tz, get_current_company_date_and_time

class AnalyticsService:
    @staticmethod
    def get_dashboard_kpis(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        department: Optional[str] = None
    ) -> Dict[str, Any]:
        curr_date, _ = get_current_company_date_and_time()
        start = start_date or curr_date
        end = end_date or curr_date

        emp_query = db.query(Employee).filter(Employee.account_status == "ACTIVE")
        if department and department != "ALL":
            emp_query = emp_query.filter(Employee.department == department)
        total_active = emp_query.count()

        # Query attendance in date range
        att_query = db.query(AttendanceRecord).join(Employee, AttendanceRecord.employee_id == Employee.employee_id)
        att_query = att_query.filter(
            AttendanceRecord.attendance_date >= start,
            AttendanceRecord.attendance_date <= end
        )
        if department and department != "ALL":
            att_query = att_query.filter(Employee.department == department)

        records = att_query.all()

        present_count = sum(1 for r in records if r.attendance_classification in ["PRESENT", "HALF_DAY"])
        full_day = sum(1 for r in records if r.attendance_classification == "PRESENT" and r.day_type == "FULL_DAY")
        half_day = sum(1 for r in records if r.attendance_classification == "HALF_DAY" or r.day_type == "HALF_DAY")
        absent_count = sum(1 for r in records if r.attendance_classification in ["ABSENT", "ON_LEAVE"])

        # Checked in today
        today_records = [r for r in records if r.attendance_date == curr_date]
        currently_in = sum(1 for r in today_records if r.check_in_timestamp and not r.check_out_timestamp)
        checked_out = sum(1 for r in today_records if r.check_in_timestamp and r.check_out_timestamp)

        # Missing checkouts: records in the past with check-in but no check-out
        missing_checkouts = sum(
            1 for r in records 
            if r.check_in_timestamp and not r.check_out_timestamp and r.attendance_date < curr_date
        )

        late_arrivals = sum(1 for r in records if r.is_late)
        incomplete_records = sum(1 for r in records if r.is_incomplete)

        valid_hours = [r.recorded_working_duration for r in records if r.recorded_working_duration is not None and r.recorded_working_duration > 0]
        total_hours = round(sum(valid_hours), 2)
        avg_hours = round(total_hours / len(valid_hours), 2) if valid_hours else 0.0

        days_count = max(1, (end - start).days + 1)
        potential_man_days = total_active * days_count
        att_rate = round((present_count / potential_man_days * 100), 1) if potential_man_days > 0 else 0.0
        abs_rate = round((absent_count / potential_man_days * 100), 1) if potential_man_days > 0 else 0.0

        # Leave requests
        leave_q = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.employee_id)
        leave_q = leave_q.filter(
            LeaveRequest.start_date <= end,
            LeaveRequest.end_date >= start
        )
        if department and department != "ALL":
            leave_q = leave_q.filter(Employee.department == department)
        leave_records = leave_q.all()

        pending_leaves = sum(1 for l in leave_records if l.status == "PENDING")
        approved_leaves = sum(1 for l in leave_records if l.status == "APPROVED")
        rejected_leaves = sum(1 for l in leave_records if l.status == "REJECTED")

        # Period comparison calculation
        prev_delta = end - start + timedelta(days=1)
        prev_start = start - prev_delta
        prev_end = start - timedelta(days=1)
        prev_att_query = db.query(AttendanceRecord).join(Employee, AttendanceRecord.employee_id == Employee.employee_id).filter(
            AttendanceRecord.attendance_date >= prev_start,
            AttendanceRecord.attendance_date <= prev_end
        )
        if department and department != "ALL":
            prev_att_query = prev_att_query.filter(Employee.department == department)
        prev_present = prev_att_query.filter(AttendanceRecord.attendance_classification.in_(["PRESENT", "HALF_DAY"])).count()
        present_diff = present_count - prev_present

        return {
            "total_active_employees": total_active,
            "present_employees": present_count,
            "full_day_attendance": full_day,
            "half_day_attendance": half_day,
            "absent_employees": absent_count,
            "currently_checked_in": currently_in,
            "checked_out_employees": checked_out,
            "pending_leave_requests": pending_leaves,
            "approved_leave_requests": approved_leaves,
            "rejected_leave_requests": rejected_leaves,
            "missing_check_outs": missing_checkouts,
            "late_arrivals": late_arrivals,
            "attendance_rate": att_rate,
            "absence_rate": abs_rate,
            "average_working_hours": avg_hours,
            "total_working_hours": total_hours,
            "incomplete_records": incomplete_records,
            "comparison": {
                "present_diff": present_diff,
                "prev_period_label": f"{prev_start.isoformat()} to {prev_end.isoformat()}"
            }
        }

    @staticmethod
    def get_attendance_distribution(
        db: Session,
        target_date: Optional[date] = None,
        department: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        curr_date, _ = get_current_company_date_and_time()
        d = target_date or curr_date

        q = db.query(AttendanceRecord).join(Employee, AttendanceRecord.employee_id == Employee.employee_id)
        q = q.filter(AttendanceRecord.attendance_date == d)
        if department and department != "ALL":
            q = q.filter(Employee.department == department)
        records = q.all()

        present = sum(1 for r in records if r.attendance_classification == "PRESENT")
        half_day = sum(1 for r in records if r.attendance_classification == "HALF_DAY")
        absent = sum(1 for r in records if r.attendance_classification == "ABSENT")
        on_leave = sum(1 for r in records if r.attendance_classification == "ON_LEAVE")

        # Pending leaves for today
        leave_q = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.employee_id)
        leave_q = leave_q.filter(LeaveRequest.start_date <= d, LeaveRequest.end_date >= d, LeaveRequest.status == "PENDING")
        if department and department != "ALL":
            leave_q = leave_q.filter(Employee.department == department)
        pending = leave_q.count()

        return [
            {"category": "Present", "count": present, "color": "#10B981"},
            {"category": "Half Day", "count": half_day, "color": "#F59E0B"},
            {"category": "Absent", "count": absent, "color": "#EF4444"},
            {"category": "Approved Leave", "count": on_leave, "color": "#00A3E0"},
            {"category": "Pending Leave", "count": pending, "color": "#F5BE2C"},
        ]

    @staticmethod
    def get_attendance_trends(
        db: Session,
        start_date: date,
        end_date: date,
        interval: str = "daily",
        department: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        trend_data = []
        curr = start_date

        while curr <= end_date:
            q = db.query(AttendanceRecord).join(Employee, AttendanceRecord.employee_id == Employee.employee_id)
            q = q.filter(AttendanceRecord.attendance_date == curr)
            if department and department != "ALL":
                q = q.filter(Employee.department == department)
            records = q.all()

            present = sum(1 for r in records if r.attendance_classification in ["PRESENT", "HALF_DAY"])
            absent = sum(1 for r in records if r.attendance_classification in ["ABSENT", "ON_LEAVE"])
            late = sum(1 for r in records if r.is_late)
            total = len(records)
            hours = sum(r.recorded_working_duration or 0 for r in records)
            avg_h = round(hours / present, 2) if present > 0 else 0.0

            trend_data.append({
                "date": curr.strftime("%b %d"),
                "iso_date": curr.isoformat(),
                "present": present,
                "absent": absent,
                "late": late,
                "total_records": total,
                "avg_hours": avg_h,
            })
            curr += timedelta(days=1)

        return trend_data

    @staticmethod
    def get_department_analytics(
        db: Session,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        departments = db.query(Employee.department).distinct().all()
        result = []

        for (dept_name,) in departments:
            if not dept_name:
                continue
            total_emps = db.query(Employee).filter(
                Employee.department == dept_name,
                Employee.account_status == "ACTIVE"
            ).count()

            att_records = db.query(AttendanceRecord).join(
                Employee, AttendanceRecord.employee_id == Employee.employee_id
            ).filter(
                Employee.department == dept_name,
                AttendanceRecord.attendance_date >= start_date,
                AttendanceRecord.attendance_date <= end_date
            ).all()

            present = sum(1 for r in att_records if r.attendance_classification in ["PRESENT", "HALF_DAY"])
            late = sum(1 for r in att_records if r.is_late)
            days = max(1, (end_date - start_date).days + 1)
            potential = total_emps * days
            rate = round((present / potential * 100), 1) if potential > 0 else 0.0

            result.append({
                "department": dept_name,
                "total_employees": total_emps,
                "present_count": present,
                "late_count": late,
                "attendance_rate": rate
            })

        return sorted(result, key=lambda x: x["attendance_rate"], reverse=True)

    @staticmethod
    def get_leave_distribution(
        db: Session,
        start_date: date,
        end_date: date,
        department: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        leave_types = ["PL", "CL", "MEDICAL"]
        result = []

        for lt in leave_types:
            q = db.query(LeaveRequest).join(Employee, LeaveRequest.employee_id == Employee.employee_id)
            q = q.filter(
                LeaveRequest.leave_type == lt,
                LeaveRequest.start_date <= end_date,
                LeaveRequest.end_date >= start_date
            )
            if department and department != "ALL":
                q = q.filter(Employee.department == department)
            recs = q.all()

            pending = sum(1 for r in recs if r.status == "PENDING")
            approved = sum(1 for r in recs if r.status == "APPROVED")
            rejected = sum(1 for r in recs if r.status == "REJECTED")

            result.append({
                "type": lt,
                "pending": pending,
                "approved": approved,
                "rejected": rejected,
                "total": pending + approved + rejected
            })

        return result

    @staticmethod
    def get_employee_ranking(
        db: Session,
        start_date: date,
        end_date: date,
        department: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        emp_query = db.query(Employee).filter(Employee.account_status == "ACTIVE")
        if department and department != "ALL":
            emp_query = emp_query.filter(Employee.department == department)
        employees = emp_query.all()

        results = []
        for emp in employees:
            records = db.query(AttendanceRecord).filter(
                AttendanceRecord.employee_id == emp.employee_id,
                AttendanceRecord.attendance_date >= start_date,
                AttendanceRecord.attendance_date <= end_date
            ).all()

            present = sum(1 for r in records if r.attendance_classification in ["PRESENT", "HALF_DAY"])
            absent = sum(1 for r in records if r.attendance_classification in ["ABSENT", "ON_LEAVE"])
            late = sum(1 for r in records if r.is_late)
            hours = sum(r.recorded_working_duration or 0 for r in records)
            avg_h = round(hours / present, 2) if present > 0 else 0.0

            results.append({
                "employee_id": emp.employee_id,
                "name": emp.name,
                "department": emp.department,
                "designation": emp.designation,
                "present_days": present,
                "absent_days": absent,
                "late_arrivals": late,
                "total_hours": round(hours, 2),
                "avg_hours": avg_h
            })

        return sorted(results, key=lambda x: x["present_days"], reverse=True)

    @staticmethod
    def get_employee_monthly_calendar(
        db: Session,
        employee_id: str,
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        import calendar
        num_days = calendar.monthrange(year, month)[1]
        start_d = date(year, month, 1)
        end_d = date(year, month, num_days)

        emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        weekly_offs = [w.strip() for w in (emp.weekly_off_days if emp else "Saturday,Sunday").split(",")]

        # Holidays in this month
        holidays = {
            h.holiday_date: h.description
            for h in db.query(Holiday).filter(Holiday.holiday_date >= start_d, Holiday.holiday_date <= end_d).all()
        }

        # Attendance records
        records = {
            r.attendance_date: r
            for r in db.query(AttendanceRecord).filter(
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.attendance_date >= start_d,
                AttendanceRecord.attendance_date <= end_d
            ).all()
        }

        calendar_days = []
        for day in range(1, num_days + 1):
            curr_date = date(year, month, day)
            day_name = curr_date.strftime("%A")
            is_off = day_name in weekly_offs
            is_holiday = curr_date in holidays
            holiday_desc = holidays.get(curr_date)

            rec = records.get(curr_date)
            status = "NOT_RECORDED"
            check_in = None
            check_out = None
            duration = None
            is_incomplete = False
            is_late = False

            if is_holiday:
                status = "HOLIDAY"
            elif is_off:
                status = "WEEKLY_OFF"

            if rec:
                status = rec.attendance_classification
                check_in = rec.check_in_timestamp.isoformat() if rec.check_in_timestamp else None
                check_out = rec.check_out_timestamp.isoformat() if rec.check_out_timestamp else None
                duration = rec.recorded_working_duration
                is_incomplete = rec.is_incomplete
                is_late = rec.is_late

            calendar_days.append({
                "date": curr_date.isoformat(),
                "day_number": day,
                "day_name": day_name,
                "status": status,
                "is_holiday": is_holiday,
                "holiday_description": holiday_desc,
                "is_weekly_off": is_off,
                "check_in": check_in,
                "check_out": check_out,
                "duration": duration,
                "is_incomplete": is_incomplete,
                "is_late": is_late
            })

        return calendar_days
