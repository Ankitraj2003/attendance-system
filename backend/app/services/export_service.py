import io
import re
from datetime import datetime, date, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import pandas as pd
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.models import AttendanceRecord, Employee, LeaveRequest, WorkSchedule
from app.services.attendance_service import get_company_tz

def sanitize_for_spreadsheet(value: Any) -> Any:
    """Protect against spreadsheet formula injection (CSV/Excel injection)."""
    if value is None:
        return ""
    str_val = str(value)
    if str_val.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{str_val}"
    return str_val

def apply_header_styling(ws, header_title: str = "Expandit Attendance Report"):
    navy_fill = PatternFill(start_color="16194F", end_color="16194F", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin', color='E2E8F0'),
        right=Side(style='thin', color='E2E8F0'),
        top=Side(style='thin', color='E2E8F0'),
        bottom=Side(style='thin', color='E2E8F0')
    )

    for cell in ws[1]:
        cell.fill = navy_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            cell.border = thin_border
            if cell.value:
                max_len = max(max_len, len(str(cell.value)))
        ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

class ExportService:
    @staticmethod
    def generate_company_excel(
        db: Session,
        start_date: date,
        end_date: date,
        department: Optional[str] = None
    ) -> io.BytesIO:
        wb = openpyxl.Workbook()
        wb.remove(wb.active) # remove default sheet

        tz = get_company_tz()
        export_time_str = datetime.now(tz).strftime("%Y-%m-%d %H:%M:%S (%Z)")

        # Sheet 1: Attendance Records
        ws_att = wb.create_sheet(title="Attendance Records")
        ws_att.append([
            "Record ID", "Employee ID", "Employee Name", "Department",
            "Attendance Date", "Status", "Day Type", "Check-In (IST)",
            "Check-Out (IST)", "Hours Worked", "Late Arrival", "Early Departure",
            "Incomplete", "Manually Corrected"
        ])

        att_q = db.query(AttendanceRecord, Employee).join(Employee, AttendanceRecord.employee_id == Employee.employee_id)
        att_q = att_q.filter(
            AttendanceRecord.attendance_date >= start_date,
            AttendanceRecord.attendance_date <= end_date
        )
        if department and department != "ALL":
            att_q = att_q.filter(Employee.department == department)

        records = att_q.order_by(AttendanceRecord.attendance_date.desc()).all()
        for rec, emp in records:
            cin = rec.check_in_timestamp.astimezone(tz).strftime("%H:%M:%S") if rec.check_in_timestamp else "-"
            cout = rec.check_out_timestamp.astimezone(tz).strftime("%H:%M:%S") if rec.check_out_timestamp else "-"
            ws_att.append([
                rec.id,
                sanitize_for_spreadsheet(emp.employee_id),
                sanitize_for_spreadsheet(emp.name),
                sanitize_for_spreadsheet(emp.department),
                rec.attendance_date.isoformat(),
                rec.attendance_classification,
                rec.day_type,
                cin,
                cout,
                rec.recorded_working_duration or 0.0,
                "Yes" if rec.is_late else "No",
                "Yes" if rec.is_early_departure else "No",
                "Yes" if rec.is_incomplete else "No",
                "Yes" if rec.is_manually_corrected else "No"
            ])
        apply_header_styling(ws_att)

        # Sheet 2: Employee Directory
        ws_emp = wb.create_sheet(title="Employee Directory")
        ws_emp.append([
            "Employee ID", "Employee Number", "Full Name", "Work Email",
            "Department", "Designation", "Joining Date", "Employment Status", "Account Status"
        ])
        emp_q = db.query(Employee)
        if department and department != "ALL":
            emp_q = emp_q.filter(Employee.department == department)
        for emp in emp_q.order_by(Employee.employee_id).all():
            ws_emp.append([
                sanitize_for_spreadsheet(emp.employee_id),
                sanitize_for_spreadsheet(emp.employee_number),
                sanitize_for_spreadsheet(emp.name),
                sanitize_for_spreadsheet(emp.work_email),
                sanitize_for_spreadsheet(emp.department),
                sanitize_for_spreadsheet(emp.designation),
                emp.date_of_joining.isoformat(),
                emp.employment_status,
                emp.account_status
            ])
        apply_header_styling(ws_emp)

        # Sheet 3: Leave Requests
        ws_leave = wb.create_sheet(title="Leave Requests")
        ws_leave.append([
            "Request ID", "Employee ID", "Employee Name", "Department",
            "Leave Type", "Start Date", "End Date", "Status",
            "Reason", "Decision Remarks", "Submitted At (IST)"
        ])
        leave_q = db.query(LeaveRequest, Employee).join(Employee, LeaveRequest.employee_id == Employee.employee_id)
        leave_q = leave_q.filter(
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        )
        if department and department != "ALL":
            leave_q = leave_q.filter(Employee.department == department)

        for l_req, emp in leave_q.order_by(LeaveRequest.created_at.desc()).all():
            submitted = l_req.created_at.astimezone(tz).strftime("%Y-%m-%d %H:%M") if l_req.created_at else "-"
            ws_leave.append([
                l_req.id,
                sanitize_for_spreadsheet(emp.employee_id),
                sanitize_for_spreadsheet(emp.name),
                sanitize_for_spreadsheet(emp.department),
                l_req.leave_type,
                l_req.start_date.isoformat(),
                l_req.end_date.isoformat(),
                l_req.status,
                sanitize_for_spreadsheet(l_req.reason),
                sanitize_for_spreadsheet(l_req.decision_remarks or l_req.rejection_reason or "-"),
                submitted
            ])
        apply_header_styling(ws_leave)

        # Sheet 4: Working Hours
        ws_hours = wb.create_sheet(title="Working Hours")
        ws_hours.append([
            "Employee ID", "Name", "Department", "Attendance Date",
            "Total Hours", "Full/Half Day", "Classification", "Late Arrival"
        ])
        for rec, emp in records:
            if rec.recorded_working_duration:
                ws_hours.append([
                    sanitize_for_spreadsheet(emp.employee_id),
                    sanitize_for_spreadsheet(emp.name),
                    sanitize_for_spreadsheet(emp.department),
                    rec.attendance_date.isoformat(),
                    rec.recorded_working_duration,
                    rec.day_type,
                    rec.attendance_classification,
                    "Yes" if rec.is_late else "No"
                ])
        apply_header_styling(ws_hours)

        # Sheet 5: Attendance Summary
        ws_sum = wb.create_sheet(title="Attendance Summary")
        ws_sum.append([
            "Metric", "Value", "Report Period", "Generated At"
        ])
        total_p = sum(1 for r, _ in records if r.attendance_classification in ["PRESENT", "HALF_DAY"])
        total_a = sum(1 for r, _ in records if r.attendance_classification in ["ABSENT", "ON_LEAVE"])
        ws_sum.append(["Total Active Employees In Scope", emp_q.count(), f"{start_date} to {end_date}", export_time_str])
        ws_sum.append(["Total Attendance Records", len(records), f"{start_date} to {end_date}", export_time_str])
        ws_sum.append(["Total Present / Half-Day", total_p, f"{start_date} to {end_date}", export_time_str])
        ws_sum.append(["Total Absent / Leave", total_a, f"{start_date} to {end_date}", export_time_str])
        ws_sum.append(["Total Late Arrivals", sum(1 for r, _ in records if r.is_late), f"{start_date} to {end_date}", export_time_str])
        apply_header_styling(ws_sum)

        # Sheet 6: Exceptions
        ws_exc = wb.create_sheet(title="Exceptions")
        ws_exc.append([
            "Exception Type", "Employee ID", "Name", "Date", "Details"
        ])
        for rec, emp in records:
            if rec.is_incomplete:
                ws_exc.append([
                    "Missing Check-Out",
                    sanitize_for_spreadsheet(emp.employee_id),
                    sanitize_for_spreadsheet(emp.name),
                    rec.attendance_date.isoformat(),
                    "Check-in recorded without matching check-out"
                ])
            if rec.is_late:
                ws_exc.append([
                    "Late Arrival",
                    sanitize_for_spreadsheet(emp.employee_id),
                    sanitize_for_spreadsheet(emp.name),
                    rec.attendance_date.isoformat(),
                    "Arrived after designated grace threshold"
                ])
            if rec.is_manually_corrected:
                ws_exc.append([
                    "Administrative Correction",
                    sanitize_for_spreadsheet(emp.employee_id),
                    sanitize_for_spreadsheet(emp.name),
                    rec.attendance_date.isoformat(),
                    sanitize_for_spreadsheet(rec.correction_reason or "Admin updated record")
                ])
        apply_header_styling(ws_exc)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    @staticmethod
    def generate_single_employee_excel(
        db: Session,
        employee_id: str,
        start_date: date,
        end_date: date
    ) -> io.BytesIO:
        wb = openpyxl.Workbook()
        wb.remove(wb.active)

        emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        tz = get_company_tz()

        # Sheet 1: Employee Profile
        ws_prof = wb.create_sheet(title="Employee Profile")
        ws_prof.append(["Field", "Value"])
        ws_prof.append(["Employee ID", sanitize_for_spreadsheet(emp.employee_id)])
        ws_prof.append(["Full Name", sanitize_for_spreadsheet(emp.name)])
        ws_prof.append(["Work Email", sanitize_for_spreadsheet(emp.work_email)])
        ws_prof.append(["Department", sanitize_for_spreadsheet(emp.department)])
        ws_prof.append(["Designation", sanitize_for_spreadsheet(emp.designation)])
        ws_prof.append(["Date of Joining", emp.date_of_joining.isoformat()])
        ws_prof.append(["Employment Status", emp.employment_status])
        ws_prof.append(["Account Status", emp.account_status])
        apply_header_styling(ws_prof)

        # Sheet 2: Attendance History
        ws_att = wb.create_sheet(title="Attendance History")
        ws_att.append([
            "Date", "Classification", "Day Type", "Check-In (IST)", "Check-Out (IST)",
            "Duration (Hours)", "Late", "Early Departure", "Incomplete", "Corrected"
        ])
        records = db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id == employee_id,
            AttendanceRecord.attendance_date >= start_date,
            AttendanceRecord.attendance_date <= end_date
        ).order_by(AttendanceRecord.attendance_date.desc()).all()

        for r in records:
            cin = r.check_in_timestamp.astimezone(tz).strftime("%H:%M:%S") if r.check_in_timestamp else "-"
            cout = r.check_out_timestamp.astimezone(tz).strftime("%H:%M:%S") if r.check_out_timestamp else "-"
            ws_att.append([
                r.attendance_date.isoformat(),
                r.attendance_classification,
                r.day_type,
                cin,
                cout,
                r.recorded_working_duration or 0.0,
                "Yes" if r.is_late else "No",
                "Yes" if r.is_early_departure else "No",
                "Yes" if r.is_incomplete else "No",
                "Yes" if r.is_manually_corrected else "No"
            ])
        apply_header_styling(ws_att)

        # Sheet 3: Leave History
        ws_l = wb.create_sheet(title="Leave History")
        ws_l.append([
            "Leave Type", "Start Date", "End Date", "Status", "Reason", "Remarks", "Date Submitted"
        ])
        leaves = db.query(LeaveRequest).filter(
            LeaveRequest.employee_id == employee_id,
            LeaveRequest.start_date <= end_date,
            LeaveRequest.end_date >= start_date
        ).order_by(LeaveRequest.created_at.desc()).all()

        for l in leaves:
            ws_l.append([
                l.leave_type,
                l.start_date.isoformat(),
                l.end_date.isoformat(),
                l.status,
                sanitize_for_spreadsheet(l.reason),
                sanitize_for_spreadsheet(l.decision_remarks or l.rejection_reason or "-"),
                l.created_at.astimezone(tz).strftime("%Y-%m-%d %H:%M")
            ])
        apply_header_styling(ws_l)

        # Sheet 4: Summary
        ws_sum = wb.create_sheet(title="Attendance Summary")
        ws_sum.append(["Metric", "Count"])
        ws_sum.append(["Total Days Recorded", len(records)])
        ws_sum.append(["Present Days", sum(1 for r in records if r.attendance_classification in ["PRESENT", "HALF_DAY"])])
        ws_sum.append(["Absent / Leave Days", sum(1 for r in records if r.attendance_classification in ["ABSENT", "ON_LEAVE"])])
        ws_sum.append(["Late Arrivals", sum(1 for r in records if r.is_late)])
        ws_sum.append(["Total Working Hours", round(sum(r.recorded_working_duration or 0 for r in records), 2)])
        apply_header_styling(ws_sum)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    @staticmethod
    def generate_csv_attendance(
        db: Session,
        start_date: date,
        end_date: date,
        employee_id: Optional[str] = None,
        department: Optional[str] = None
    ) -> str:
        tz = get_company_tz()
        q = db.query(AttendanceRecord, Employee).join(Employee, AttendanceRecord.employee_id == Employee.employee_id)
        q = q.filter(
            AttendanceRecord.attendance_date >= start_date,
            AttendanceRecord.attendance_date <= end_date
        )
        if employee_id:
            q = q.filter(AttendanceRecord.employee_id == employee_id)
        if department and department != "ALL":
            q = q.filter(Employee.department == department)

        records = q.order_by(AttendanceRecord.attendance_date.desc()).all()

        rows = []
        for rec, emp in records:
            cin = rec.check_in_timestamp.astimezone(tz).strftime("%H:%M:%S") if rec.check_in_timestamp else ""
            cout = rec.check_out_timestamp.astimezone(tz).strftime("%H:%M:%S") if rec.check_out_timestamp else ""
            rows.append({
                "Record ID": rec.id,
                "Employee ID": sanitize_for_spreadsheet(emp.employee_id),
                "Employee Name": sanitize_for_spreadsheet(emp.name),
                "Department": sanitize_for_spreadsheet(emp.department),
                "Date": rec.attendance_date.isoformat(),
                "Status": rec.attendance_classification,
                "Day Type": rec.day_type,
                "Check In (IST)": cin,
                "Check Out (IST)": cout,
                "Working Hours": rec.recorded_working_duration or 0.0,
                "Is Late": "Yes" if rec.is_late else "No",
                "Is Early Departure": "Yes" if rec.is_early_departure else "No",
                "Is Incomplete": "Yes" if rec.is_incomplete else "No"
            })

        df = pd.DataFrame(rows)
        return df.to_csv(index=False)
