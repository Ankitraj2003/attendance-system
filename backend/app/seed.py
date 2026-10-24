import os
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models import User, Employee, WorkSchedule, AttendanceRecord, LeaveRequest, AttendanceAttachment, Holiday, AuditLog, Department
from app.auth import get_password_hash
from app.config import settings

def seed_database():
    # Create tables
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # Production may initialize the administrator only from secret environment
        # configuration. Existing administrator credentials are never overwritten.
        if settings.ENVIRONMENT == "production":
            admin_username = os.getenv("INITIAL_ADMIN_USERNAME", "admin").strip() or "admin"
            admin_email = os.getenv("INITIAL_ADMIN_EMAIL", "admin@expandit.com").strip().lower()
            admin = db.query(User).filter(User.username == admin_username).first()
            if admin is None and settings.INITIAL_ADMIN_PASSWORD:
                admin = User(
                    username=admin_username,
                    email=admin_email,
                    password_hash=get_password_hash(settings.INITIAL_ADMIN_PASSWORD),
                    role="ADMIN",
                    account_status="ACTIVE",
                )
                db.add(admin)
                print("Initial administrator created from environment configuration.")
            elif admin is None:
                print("No administrator created: set INITIAL_ADMIN_PASSWORD securely in the service environment.")
        else:
            # Development/test bootstrap retains a local-only convenience account.
            admin = db.query(User).filter(User.username == "admin").first()
            if not admin:
                admin = User(
                    username="admin",
                    email="admin@expandit.com",
                    password_hash=get_password_hash("Sia_Sandeep@2010"),
                    role="ADMIN",
                    account_status="ACTIVE"
                )
                db.add(admin)
                db.flush()

        # 2. Work Schedules
        schedule_standard = db.query(WorkSchedule).filter(WorkSchedule.schedule_name == "Standard Corporate Shift").first()
        if not schedule_standard:
            schedule_standard = WorkSchedule(
                schedule_name="Standard Corporate Shift",
                start_time="10:00",
                end_time="19:00",
                working_days="Monday,Tuesday,Wednesday,Thursday,Friday,Saturday",
                late_arrival_threshold_minutes=15,
                minimum_hours_full_day=8.0,
                minimum_hours_half_day=4.0,
                is_overnight=False,
                effective_date=date(2026, 1, 1)
            )
            db.add(schedule_standard)
            db.flush()

        else:
            schedule_standard.working_days = "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday"
            db.flush()

        # Seed default departments
        default_depts = ["Engineering", "Marketing", "Operations", "Human Resources"]
        for dept_name in default_depts:
            if not db.query(Department).filter(Department.name == dept_name).first():
                db.add(Department(name=dept_name))
        db.flush()

        # Migrate existing employees' weekly off to Sunday only
        for existing_emp in db.query(Employee).all():
            if existing_emp.weekly_off_days == "Saturday,Sunday" or not existing_emp.weekly_off_days:
                existing_emp.weekly_off_days = "Sunday"
        db.flush()

        # 3. Sample Holidays
        holidays_data = [
            (date(2026, 1, 26), "Republic Day", "PUBLIC"),
            (date(2026, 8, 15), "Independence Day", "PUBLIC"),
            (date(2026, 10, 2), "Gandhi Jayanti", "PUBLIC"),
            (date(2026, 11, 8), "Diwali", "PUBLIC"),
            (date(2026, 12, 25), "Christmas Day", "PUBLIC"),
        ]
        for h_date, desc, h_type in holidays_data:
            if not db.query(Holiday).filter(Holiday.holiday_date == h_date).first():
                db.add(Holiday(holiday_date=h_date, description=desc, holiday_type=h_type))

        # Production needs schedules and holidays, but must not fabricate employees,
        # attendance history, or leave requests for an actual company.
        if settings.ENVIRONMENT == "production":
            db.commit()
            print("Production reference data initialized; demo records were skipped.")
            return

        # 4. Sample Employees
        sample_employees = [
            {
                "employee_id": "EXP-101",
                "employee_number": "EMP001",
                "name": "Aarav Sharma",
                "work_email": "aarav.sharma@expandit.com",
                "department": "Engineering",
                "designation": "Lead Full-Stack Engineer",
                "date_of_joining": date(2024, 3, 1),
                "token_secret": "token_aarav_sharma_exp101_secure"
            },
            {
                "employee_id": "EXP-102",
                "employee_number": "EMP002",
                "name": "Priya Nair",
                "work_email": "priya.nair@expandit.com",
                "department": "Product & Design",
                "designation": "Senior UI/UX Designer",
                "date_of_joining": date(2024, 5, 15),
                "token_secret": "token_priya_nair_exp102_secure"
            },
            {
                "employee_id": "EXP-103",
                "employee_number": "EMP003",
                "name": "Rohan Patel",
                "work_email": "rohan.patel@expandit.com",
                "department": "Marketing",
                "designation": "Growth Marketing Manager",
                "date_of_joining": date(2024, 8, 1),
                "token_secret": "token_rohan_patel_exp103_secure"
            },
            {
                "employee_id": "EXP-104",
                "employee_number": "EMP004",
                "name": "Sneha Kulkarni",
                "work_email": "sneha.k@expandit.com",
                "department": "Engineering",
                "designation": "Backend Systems Architect",
                "date_of_joining": date(2025, 1, 10),
                "token_secret": "token_sneha_kulkarni_exp104_secure"
            },
            {
                "employee_id": "EXP-105",
                "employee_number": "EMP005",
                "name": "Vikram Singh",
                "work_email": "vikram.s@expandit.com",
                "department": "Human Resources",
                "designation": "HR Operations Specialist",
                "date_of_joining": date(2025, 2, 1),
                "token_secret": "token_vikram_singh_exp105_secure"
            },
        ]

        created_emps = []
        for emp_info in sample_employees:
            emp = db.query(Employee).filter(Employee.employee_id == emp_info["employee_id"]).first()
            if not emp:
                emp = Employee(
                    employee_id=emp_info["employee_id"],
                    employee_number=emp_info["employee_number"],
                    name=emp_info["name"],
                    work_email=emp_info["work_email"],
                    department=emp_info["department"],
                    designation=emp_info["designation"],
                    date_of_joining=emp_info["date_of_joining"],
                    employment_status="FULL_TIME",
                    account_status="ACTIVE",
                    token_secret=emp_info["token_secret"],
                    assigned_schedule_id=schedule_standard.id,
                    weekly_off_days="Sunday"
                )
                db.add(emp)
                db.flush()
            created_emps.append(emp)

        # 5. Populate Historical Attendance (Last 14 days)
        today = date.today()
        tz = ZoneInfo("Asia/Kolkata")

        for offset in range(14, 0, -1):
            day_date = today - timedelta(days=offset)
            # Skip weekends for standard work
            if day_date.strftime("%A") == "Sunday":
                continue

            for emp in created_emps:
                # Check if record already exists
                existing_r = db.query(AttendanceRecord).filter(
                    AttendanceRecord.employee_id == emp.employee_id,
                    AttendanceRecord.attendance_date == day_date
                ).first()
                if existing_r:
                    continue

                # Simulate realistic variation: mostly present, occasionally half-day or late
                if emp.employee_id == "EXP-103" and offset == 5:
                    # Absent record
                    db.add(AttendanceRecord(
                        employee_id=emp.employee_id,
                        attendance_date=day_date,
                        attendance_classification="ABSENT",
                        day_type="FULL_DAY",
                        is_incomplete=False
                    ))
                    continue

                # Normal check-in between 09:15 and 09:50
                is_late = (offset % 4 == 0) and (emp.employee_id in ["EXP-101", "EXP-103"])
                in_hour = 9
                in_min = 45 if is_late else 20
                cin_local = datetime(day_date.year, day_date.month, day_date.day, in_hour, in_min, tzinfo=tz)
                cout_local = datetime(day_date.year, day_date.month, day_date.day, 18, 30, tzinfo=tz)

                cin_utc = cin_local.astimezone(timezone.utc)
                cout_utc = cout_local.astimezone(timezone.utc)
                duration = round((cout_local - cin_local).total_seconds() / 3600.0, 2)

                classification = "PRESENT"
                day_t = "FULL_DAY"

                db.add(AttendanceRecord(
                    employee_id=emp.employee_id,
                    attendance_date=day_date,
                    attendance_classification=classification,
                    day_type=day_t,
                    check_in_timestamp=cin_utc,
                    check_out_timestamp=cout_utc,
                    recorded_working_duration=duration,
                    is_late=is_late,
                    is_early_departure=False,
                    is_incomplete=False,
                    schedule_id=schedule_standard.id
                ))

        # 6. Seed today's record for EXP-101 (Checked in today)
        today_rec = db.query(AttendanceRecord).filter(
            AttendanceRecord.employee_id == "EXP-101",
            AttendanceRecord.attendance_date == today
        ).first()
        if not today_rec:
            cin_today = datetime(today.year, today.month, today.day, 9, 25, tzinfo=tz).astimezone(timezone.utc)
            db.add(AttendanceRecord(
                employee_id="EXP-101",
                attendance_date=today,
                attendance_classification="PRESENT",
                day_type="FULL_DAY",
                check_in_timestamp=cin_today,
                check_out_timestamp=None,
                recorded_working_duration=None,
                is_late=False,
                is_incomplete=True,
                schedule_id=schedule_standard.id
            ))

        # 7. Seed a pending leave request with a sample PDF attachment
        pending_leave = db.query(LeaveRequest).filter(LeaveRequest.employee_id == "EXP-102").first()
        if not pending_leave:
            sample_storage_dir = settings.STORAGE_DIR
            os.makedirs(sample_storage_dir, exist_ok=True)
            doc_filename = "EXP-102_medical_certificate.pdf"
            doc_path = os.path.join(sample_storage_dir, doc_filename)
            with open(doc_path, "wb") as f:
                # Standard minimal valid PDF header
                f.write(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF\n")

            leave = LeaveRequest(
                employee_id="EXP-102",
                leave_type="MEDICAL",
                start_date=today + timedelta(days=2),
                end_date=today + timedelta(days=3),
                reason="Medical procedure recovery as advised by physician",
                status="PENDING"
            )
            db.add(leave)
            db.flush()

            att = AttendanceAttachment(
                leave_request_id=leave.id,
                employee_id="EXP-102",
                original_filename="Medical_Fitness_Certificate.pdf",
                stored_filename=doc_filename,
                mime_type="application/pdf",
                file_size=os.path.getsize(doc_path),
                storage_path=doc_path
            )
            db.add(att)

        db.commit()
        print("Database seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
