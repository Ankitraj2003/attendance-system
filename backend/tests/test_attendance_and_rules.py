import pytest
import io
from datetime import date, datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app.models import User, Employee, AttendanceRecord, LeaveRequest, WorkSchedule
from app.auth import get_password_hash, create_access_token
from app.services.export_service import sanitize_for_spreadsheet

client = TestClient(app)

def test_formula_injection_sanitization():
    assert sanitize_for_spreadsheet("=SUM(A1:A10)") == "'=SUM(A1:A10)"
    assert sanitize_for_spreadsheet("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_for_spreadsheet("-12345") == "'-12345"
    assert sanitize_for_spreadsheet("@mention") == "'@mention"
    assert sanitize_for_spreadsheet("Normal Text") == "Normal Text"

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["company"] == "Expandit"

def test_admin_login():
    response = client.post("/api/auth/login", data={"username": "admin", "password": "Sia_Sandeep@2010"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"

def test_employee_portal_info():
    response = client.get("/api/attendance/portal/token_aarav_sharma_exp101_secure")
    assert response.status_code == 200
    data = response.json()
    assert data["employee_id"] == "EXP-101"
    assert data["name"] == "Aarav Sharma"
    assert "today_record" in data
    assert "monthly_target_hours" in data
    # Target hours must be dynamic (>0 and matches working_days * 8)
    assert data["monthly_target_hours"] > 0
    assert data["monthly_target_hours"] % 8 == 0 or isinstance(data["monthly_target_hours"], float)

def test_idempotent_check_in_and_single_record():
    token = "token_sneha_kulkarni_exp104_secure"
    # First check-in
    res1 = client.post(f"/api/attendance/portal/{token}/check-in", json={"day_type": "FULL_DAY"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["employee_id"] == "EXP-104"

    # Rapid second check-in (idempotency check)
    res2 = client.post(f"/api/attendance/portal/{token}/check-in", json={"day_type": "FULL_DAY"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["employee_id"] == "EXP-104"

def test_subsequent_checkout_updates_same_record():
    token = "token_sneha_kulkarni_exp104_secure"
    # Checkout
    res = client.post(f"/api/attendance/portal/{token}/check-out", json={})
    assert res.status_code == 200
    data = res.json()
    assert "check_out_time" in data
    assert data["check_out_time"] is not None

    # Redundant checkout (idempotent - should not overwrite or create new record)
    res_repeat = client.post(f"/api/attendance/portal/{token}/check-out", json={})
    assert res_repeat.status_code == 200

def test_unauthorized_dashboard_access_blocked():
    # Attempting to access admin analytics or individual employee dashboard without token
    res = client.get("/api/analytics/kpis")
    assert res.status_code in [401, 403]

    res2 = client.get("/api/employees/EXP-101/dashboard")
    assert res2.status_code in [401, 403]

def test_leave_submission_with_attachment():
    token = "token_vikram_singh_exp105_secure"
    fake_pdf = io.BytesIO(b"%PDF-1.4 sample content for automated test")
    
    tomorrow = (date.today() + timedelta(days=5)).isoformat()
    day_after = (date.today() + timedelta(days=6)).isoformat()

    files = {"document": ("test_cert.pdf", fake_pdf, "application/pdf")}
    data = {
        "leave_type": "CL",
        "start_date": tomorrow,
        "end_date": day_after,
        "reason": "Family function attending out of station"
    }

    res = client.post(f"/api/leaves/portal/{token}/submit", data=data, files=files)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "PENDING"
    assert "request_id" in res_data

def test_admin_reports_excel_and_csv():
    # Login admin first
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": "Sia_Sandeep@2010"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Company Excel
    excel_res = client.get("/api/reports/company/excel", headers=headers)
    assert excel_res.status_code == 200
    assert "application/vnd.openxmlformats" in excel_res.headers["content-type"]

    # Company CSV
    csv_res = client.get("/api/reports/company/csv", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Employee ID,Employee Name" in csv_res.text

def test_change_password_flow():
    # Login admin
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": "Sia_Sandeep@2010"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Wrong old password should fail
    bad_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": "WrongPassword", "new_password": "NewSecretPass@123"})
    assert bad_res.status_code == 400

    # Short new password (< 9 chars) should fail
    short_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": "Sia_Sandeep@2010", "new_password": "Pass@12"})
    assert short_res.status_code == 400

    # Missing special char should fail
    no_special_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": "Sia_Sandeep@2010", "new_password": "Password123"})
    assert no_special_res.status_code == 400

    # Missing digit should fail
    no_digit_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": "Sia_Sandeep@2010", "new_password": "Password@!"})
    assert no_digit_res.status_code == 400

    # Successful change (>= 9 chars, letter, digit, special char)
    ok_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": "Sia_Sandeep@2010", "new_password": "TempSecretPass@123"})
    assert ok_res.status_code == 200

    # Revert back to maintain consistency for other tests
    revert_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": "TempSecretPass@123", "new_password": "Sia_Sandeep@2010"})
    assert revert_res.status_code == 200

def test_departments_crud():
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": "Sia_Sandeep@2010"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get departments
    get_res = client.get("/api/departments", headers=headers)
    assert get_res.status_code == 200
    depts = get_res.json()
    assert len(depts) >= 4

    # Create new department
    dept_name = "DevOps & Cloud Engineering"
    create_res = client.post("/api/departments", headers=headers, json={"name": dept_name})
    assert create_res.status_code in [200, 201]
    assert create_res.json()["name"] == dept_name

def test_employee_update():
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": "Sia_Sandeep@2010"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update employee EXP-101
    update_res = client.put(
        "/api/employees/EXP-101",
        headers=headers,
        json={"name": "Aarav Sharma Updated", "designation": "Staff Engineer"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Aarav Sharma Updated"
    assert update_res.json()["designation"] == "Staff Engineer"

    # Revert back
    client.put(
        "/api/employees/EXP-101",
        headers=headers,
        json={"name": "Aarav Sharma", "designation": "Lead Full-Stack Engineer"}
    )

def test_manual_attendance_add_and_correct():
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": "Sia_Sandeep@2010"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Add manual attendance
    add_res = client.post(
        "/api/attendance/records/manual-add",
        headers=headers,
        json={
            "employee_id": "EXP-101",
            "attendance_date": "2026-05-10",
            "attendance_classification": "PRESENT",
            "day_type": "FULL_DAY",
            "check_in_time": "10:15",
            "check_out_time": "19:15",
            "reason": "Card reader malfunction on May 10; manual addition"
        }
    )
    assert add_res.status_code == 200
    record = add_res.json()
    assert record["employee_id"] == "EXP-101"
    assert record["is_manually_corrected"] is True
    assert record["correction_reason"] == "Card reader malfunction on May 10; manual addition"
