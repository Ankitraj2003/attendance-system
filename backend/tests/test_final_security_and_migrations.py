import os
import pytest
from datetime import date, datetime, timedelta, timezone
from jose import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.config import settings
from app.database import Base, get_db
from app.models import User, Employee, WorkSchedule, AttendanceRecord
from app.auth import get_password_hash, create_access_token
from update_schema import apply_schema_ddl, apply_reference_data, apply_safe_backfills

# Isolated test client
client = TestClient(app)

ADMIN_USERNAME = "test_sec_admin"
ADMIN_PASSWORD = "StrongSecureAdminPass@2026!"
NON_ADMIN_USERNAME = "test_staff_user"
NON_ADMIN_PASSWORD = "StaffUserPass@2026!"

@pytest.fixture(autouse=True)
def setup_test_security_users(db_session):
    """Seed test users with explicit token versions for testing."""
    # Ensure test admin exists
    admin = db_session.query(User).filter(User.username == ADMIN_USERNAME).first()
    if not admin:
        admin = User(
            username=ADMIN_USERNAME,
            email="sec_admin@test.local",
            password_hash=get_password_hash(ADMIN_PASSWORD),
            role="ADMIN",
            account_status="ACTIVE",
            token_version=1
        )
        db_session.add(admin)

    # Ensure non-admin user exists
    non_admin = db_session.query(User).filter(User.username == NON_ADMIN_USERNAME).first()
    if not non_admin:
        non_admin = User(
            username=NON_ADMIN_USERNAME,
            email="staff@test.local",
            password_hash=get_password_hash(NON_ADMIN_PASSWORD),
            role="STAFF",
            account_status="ACTIVE",
            token_version=1
        )
        db_session.add(non_admin)

    db_session.commit()
    return admin


# ==============================================================================
# 1. JWT Token-Version & Session Invalidation Tests
# ==============================================================================

def test_valid_jwt_with_correct_version_accepted():
    token = create_access_token({"sub": ADMIN_USERNAME, "role": "ADMIN", "token_version": 1})
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["username"] == ADMIN_USERNAME


def test_legacy_jwt_without_token_version_rejected():
    # Legacy token without token_version claim
    token = create_access_token({"sub": ADMIN_USERNAME, "role": "ADMIN"})
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "token version" in res.json()["detail"].lower()


def test_jwt_with_outdated_token_version_rejected():
    # Token has version 1, but user is on version 2
    token = create_access_token({"sub": ADMIN_USERNAME, "role": "ADMIN", "token_version": 99})
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "session has expired" in res.json()["detail"].lower()


@pytest.mark.parametrize("invalid_version", [
    True,          # boolean True
    False,         # boolean False
    "1",           # string
    1.5,           # float
    0,             # zero
    -1,            # negative integer
    None,          # None
    [1],           # list
])
def test_jwt_with_malformed_token_version_rejected(invalid_version):
    # Construct raw JWT with malformed token_version claim
    payload = {
        "sub": ADMIN_USERNAME,
        "role": "ADMIN",
        "token_version": invalid_version,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15)
    }
    raw_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw_token}"})
    assert res.status_code == 401
    assert "token version" in res.json()["detail"].lower()


def test_expired_jwt_rejected():
    payload = {
        "sub": ADMIN_USERNAME,
        "role": "ADMIN",
        "token_version": 1,
        "exp": datetime.now(timezone.utc) - timedelta(minutes=5)
    }
    expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "could not validate credentials" in res.json()["detail"].lower()


def test_invalid_signature_jwt_rejected():
    payload = {
        "sub": ADMIN_USERNAME,
        "role": "ADMIN",
        "token_version": 1,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=15)
    }
    tampered_token = jwt.encode(payload, "wrong-forged-secret-key-0000000000000", algorithm=settings.ALGORITHM)
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401


def test_password_change_invalidates_active_sessions(db_session):
    # Step 1: Issue token before password change
    user = db_session.query(User).filter(User.username == ADMIN_USERNAME).first()
    user.token_version = 1
    db_session.commit()

    old_token = create_access_token({"sub": ADMIN_USERNAME, "role": "ADMIN", "token_version": 1})
    res_before = client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert res_before.status_code == 200

    # Step 2: Change password via /api/auth/change-password
    new_pwd = "UpdatedSecurePassword@2026!"
    change_res = client.post(
        "/api/auth/change-password",
        headers={"Authorization": f"Bearer {old_token}"},
        json={"old_password": ADMIN_PASSWORD, "new_password": new_pwd}
    )
    assert change_res.status_code == 200

    # Step 3: Verify old token is now REJECTED immediately
    res_after = client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert res_after.status_code == 401
    assert "session has expired" in res_after.json()["detail"].lower()

    # Step 4: Login with new password gives new token version (2)
    login_res = client.post("/api/auth/login", data={"username": ADMIN_USERNAME, "password": new_pwd})
    assert login_res.status_code == 200
    new_token = login_res.json()["access_token"]

    # Step 5: New token is accepted
    res_new = client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    assert res_new.status_code == 200


def test_flexible_admin_auth_rejects_legacy_tokens():
    # Legacy token without token_version passed to flexible endpoint
    legacy_token = create_access_token({"sub": ADMIN_USERNAME, "role": "ADMIN"})
    res = client.get(f"/api/reports/company/csv?token={legacy_token}")
    assert res.status_code == 401
    assert "token version" in res.json()["detail"].lower()


def test_non_admin_cannot_access_admin_endpoints():
    token = create_access_token({"sub": NON_ADMIN_USERNAME, "role": "STAFF", "token_version": 1})
    res = client.get("/api/analytics/kpis", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "administrator authorization required" in res.json()["detail"].lower()


def test_deactivated_user_token_rejected(db_session):
    user = db_session.query(User).filter(User.username == NON_ADMIN_USERNAME).first()
    user.account_status = "DEACTIVATED"
    db_session.commit()

    token = create_access_token({"sub": NON_ADMIN_USERNAME, "role": "STAFF", "token_version": 1})
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "deactivated" in res.json()["detail"].lower()

    # Restore status for other tests
    user.account_status = "ACTIVE"
    db_session.commit()


# ==============================================================================
# 2. Unsafe Database Update Protection Tests
# ==============================================================================

def test_safe_backfills_preserves_custom_schedules_and_employee_preferences(db_session):
    # Setup custom work schedule with non-standard timings
    custom_sched = db_session.query(WorkSchedule).filter(WorkSchedule.schedule_name == "Engineering Flex Shift").first()
    if not custom_sched:
        custom_sched = WorkSchedule(
            schedule_name="Engineering Flex Shift",
            start_time="11:30",
            end_time="20:30",
            working_days="Monday,Tuesday,Wednesday,Thursday,Friday"
        )
        db_session.add(custom_sched)

    # Setup employee with custom weekly off days (e.g. Friday, Saturday)
    custom_emp = db_session.query(Employee).filter(Employee.employee_id == "EXP-CUSTOM-01").first()
    if not custom_emp:
        custom_emp = Employee(
            employee_id="EXP-CUSTOM-01",
            employee_number="EMP999",
            name="Custom Worker",
            work_email="custom.worker@expandit.com",
            department="Engineering",
            designation="Architect",
            token_secret="token_custom_worker_secure_999",
            date_of_joining=date(2024, 1, 1),
            weekly_off_days="Friday,Saturday"
        )
        db_session.add(custom_emp)

    db_session.commit()

    # Execute safe backfills function from update_schema.py
    connection = db_session.connection()
    apply_safe_backfills(connection)
    db_session.commit()

    # Verify custom work schedule was NOT overwritten
    db_session.refresh(custom_sched)
    assert custom_sched.start_time == "11:30", "Custom shift start_time must not be overwritten"
    assert custom_sched.end_time == "20:30", "Custom shift end_time must not be overwritten"
    assert custom_sched.working_days == "Monday,Tuesday,Wednesday,Thursday,Friday"

    # Verify employee's custom weekly off days were NOT overwritten
    db_session.refresh(custom_emp)
    assert custom_emp.weekly_off_days == "Friday,Saturday", "Custom employee weekly_off_days must not be overwritten to Sunday"


# ==============================================================================
# 3. Migration Idempotency & Schema Safety Tests
# ==============================================================================

def test_migration_idempotent_when_token_version_already_exists():
    """Verify migration handles pre-existing token_version column gracefully (as in Neon production)."""
    test_engine = create_engine("sqlite:///:memory:", poolclass=StaticPool)
    with test_engine.connect() as conn:
        # Create users table with token_version already present
        conn.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR(50), token_version INTEGER DEFAULT 1 NOT NULL);"))
        conn.execute(text("CREATE TABLE employees (id INTEGER PRIMARY KEY, employee_id VARCHAR(50), date_of_exit DATE);"))
        conn.commit()

        # Run DDL function
        apply_schema_ddl(conn)
        conn.commit()

        inspector = inspect(conn)
        user_cols = {c["name"] for c in inspector.get_columns("users")}
        assert "token_version" in user_cols


# ==============================================================================
# 4. Leave Approval Attendance Waiving & Rejection Safety Tests
# ==============================================================================

import io
from fastapi import UploadFile

def test_approved_leave_waives_checkin_checkout(db_session):
    token = "token_aarav_sharma_exp101_secure"
    admin = db_session.query(User).filter(User.username == ADMIN_USERNAME).first()
    emp = db_session.query(Employee).filter(Employee.employee_id == "EXP-101").first()

    today = date.today()

    # Create and approve a leave request for today
    fake_pdf = io.BytesIO(b"%PDF-1.4 sample content for automated test")
    upload = UploadFile(filename="medical.pdf", file=fake_pdf)
    from app.services.leave_service import LeaveService
    leave_req = LeaveService.create_leave_request(
        db=db_session,
        employee=emp,
        leave_type="SL",
        start_date=today,
        end_date=today,
        reason="Doctor prescribed medical rest",
        attachment_file=upload
    )
    # Admin approves the leave
    LeaveService.process_decision(
        db=db_session,
        request_id=leave_req.id,
        admin_user=admin,
        status_choice="APPROVED",
        remarks="Approved by management"
    )

    # 1. Portal reflects approved leave
    portal_res = client.get(f"/api/attendance/portal/{token}")
    assert portal_res.status_code == 200
    p_data = portal_res.json()
    assert p_data["is_approved_leave"] is True
    assert p_data["today_record"]["status"] == "ON_LEAVE"

    # 2. Check-in attempt is rejected with 400
    cin_res = client.post(f"/api/attendance/portal/{token}/check-in", json={"day_type": "FULL_DAY"})
    assert cin_res.status_code == 400
    assert "not required" in cin_res.json()["detail"].lower()

    # 3. Check-out attempt is rejected with 400
    cout_res = client.post(f"/api/attendance/portal/{token}/check-out", json={})
    assert cout_res.status_code == 400
    assert "not required" in cout_res.json()["detail"].lower()


def test_rejected_leave_remains_as_it_is(db_session):
    emp = db_session.query(Employee).filter(Employee.employee_id == "EXP-105").first()
    admin = db_session.query(User).filter(User.username == ADMIN_USERNAME).first()
    future_date = date.today() + timedelta(days=20)

    fake_pdf = io.BytesIO(b"%PDF-1.4 sample content for automated test")
    upload = UploadFile(filename="cert.pdf", file=fake_pdf)
    from app.services.leave_service import LeaveService
    leave_req = LeaveService.create_leave_request(
        db=db_session,
        employee=emp,
        leave_type="CL",
        start_date=future_date,
        end_date=future_date,
        reason="Personal travel",
        attachment_file=upload
    )

    # Admin rejects the leave
    LeaveService.process_decision(
        db=db_session,
        request_id=leave_req.id,
        admin_user=admin,
        status_choice="REJECTED",
        rejection_reason="Insufficient team coverage"
    )

    # Verify placeholder record was removed so future date remains completely untouched
    rec = db_session.query(AttendanceRecord).filter(
        AttendanceRecord.employee_id == emp.employee_id,
        AttendanceRecord.attendance_date == future_date
    ).first()
    assert rec is None, "Rejected leave should not leave pre-marked absence records"
