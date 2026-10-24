import os
import pytest
from datetime import date

# Ensure test environment variables are set before any app imports
os.environ["TESTING"] = "1"
os.environ["ENVIRONMENT"] = "development"
os.environ["DEV_ADMIN_PASSWORD"] = "LocalDevAdmin@2026!"
os.environ["SECRET_KEY"] = "ci-test-secret-key-minimum-32-chars-long-strictly-for-testing"

from app.database import Base, engine, SessionLocal, get_db
from app.main import app
from app.models import User, Employee, WorkSchedule, Department
from app.auth import get_password_hash

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed test admin
        admin = User(
            username="admin",
            email="admin@example.com",
            password_hash=get_password_hash("LocalDevAdmin@2026!"),
            role="ADMIN",
            account_status="ACTIVE",
            token_version=1
        )
        db.add(admin)

        # Seed standard work schedule
        schedule = WorkSchedule(
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
        db.add(schedule)
        db.flush()

        # Seed default departments
        for dept in ["Engineering", "Marketing", "Operations", "Human Resources"]:
            db.add(Department(name=dept))

        # Seed sample employees
        emps = [
            ("EXP-101", "EMP001", "Aarav Sharma", "aarav@example.com", "Engineering", "Lead Engineer", "token_aarav_sharma_exp101_secure"),
            ("EXP-104", "EMP004", "Sneha Kulkarni", "sneha@example.com", "Marketing", "Marketing Lead", "token_sneha_kulkarni_exp104_secure"),
            ("EXP-105", "EMP005", "Vikram Singh", "vikram@example.com", "Operations", "Operations Specialist", "token_vikram_singh_exp105_secure"),
        ]
        for eid, enum, name, email, dept, desig, token in emps:
            db.add(Employee(
                employee_id=eid,
                employee_number=enum,
                name=name,
                work_email=email,
                department=dept,
                designation=desig,
                date_of_joining=date(2024, 1, 1),
                employment_status="FULL_TIME",
                account_status="ACTIVE",
                token_secret=token,
                assigned_schedule_id=schedule.id,
                weekly_off_days="Sunday"
            ))

        db.commit()
    finally:
        db.close()

    yield

    Base.metadata.drop_all(bind=engine)
