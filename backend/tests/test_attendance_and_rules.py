import os
os.environ["TESTING"] = "1"
os.environ["ENVIRONMENT"] = "development"
os.environ["DEV_ADMIN_PASSWORD"] = "LocalDevAdmin@2026!"
os.environ["SECRET_KEY"] = "ci-test-secret-key-minimum-32-chars-long-strictly-for-testing"
import io
import pytest
from datetime import date, datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import get_db, Base
from app.models import User, Employee, AttendanceRecord, LeaveRequest, WorkSchedule
from app.auth import get_password_hash, create_access_token
from app.services.export_service import sanitize_for_spreadsheet
from app.rate_limiter import reset_all_rate_limits

client = TestClient(app)
ADMIN_PASSWORD = os.getenv("DEV_ADMIN_PASSWORD", "LocalDevAdmin@2026!")

@pytest.fixture(autouse=True)
def clean_rate_limits():
    reset_all_rate_limits()
    yield
    reset_all_rate_limits()

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

def test_security_headers_present():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert "strict-origin-when-cross-origin" in response.headers.get("referrer-policy", "")
    assert "default-src" in response.headers.get("content-security-policy", "")

def test_admin_login():
    response = client.post("/api/auth/login", data={"username": "admin", "password": ADMIN_PASSWORD})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"

def test_admin_login_invalid_password_returns_generic_error():
    response = client.post("/api/auth/login", data={"username": "admin", "password": "WrongPassword@999"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username/email or password"

def test_login_rate_limiting_brute_force():
    # Attempt 5 wrong logins
    for _ in range(5):
        res = client.post("/api/auth/login", data={"username": "admin", "password": "WrongPassword@123"})
        assert res.status_code == 401
    
    # 6th attempt should be blocked with 429 Too Many Requests
    blocked_res = client.post("/api/auth/login", data={"username": "admin", "password": "WrongPassword@123"})
    assert blocked_res.status_code == 429
    assert "Too many failed login attempts" in blocked_res.json()["detail"]

def test_employee_portal_info():
    response = client.get("/api/attendance/portal/token_aarav_sharma_exp101_secure")
    assert response.status_code == 200
    data = response.json()
    assert data["employee_id"] == "EXP-101"
    assert data["name"] == "Aarav Sharma"
    assert "today_record" in data
    assert "monthly_target_hours" in data
    assert data["monthly_target_hours"] > 0
    assert data["monthly_target_hours"] % 8 == 0 or isinstance(data["monthly_target_hours"], float)

def test_idempotent_check_in_and_single_record():
    token = "token_sneha_kulkarni_exp104_secure"
    res1 = client.post(f"/api/attendance/portal/{token}/check-in", json={"day_type": "FULL_DAY"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["employee_id"] == "EXP-104"

    res2 = client.post(f"/api/attendance/portal/{token}/check-in", json={"day_type": "FULL_DAY"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["employee_id"] == "EXP-104"

def test_subsequent_checkout_updates_same_record():
    token = "token_sneha_kulkarni_exp104_secure"
    client.post(f"/api/attendance/portal/{token}/check-in", json={"day_type": "FULL_DAY"})
    res = client.post(f"/api/attendance/portal/{token}/check-out", json={})
    assert res.status_code == 200
    data = res.json()
    assert "check_out_time" in data
    assert data["check_out_time"] is not None

    res_repeat = client.post(f"/api/attendance/portal/{token}/check-out", json={})
    assert res_repeat.status_code == 200

def test_unauthorized_dashboard_access_blocked():
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
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": ADMIN_PASSWORD})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    excel_res = client.get("/api/reports/company/excel", headers=headers)
    assert excel_res.status_code == 200
    assert "application/vnd.openxmlformats" in excel_res.headers["content-type"]

    csv_res = client.get("/api/reports/company/csv", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Employee ID,Employee Name" in csv_res.text

def test_change_password_flow_and_session_invalidation():
    # Login admin
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": ADMIN_PASSWORD})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Wrong old password should fail
    bad_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": "WrongPassword", "new_password": "NewSecretPass@123"})
    assert bad_res.status_code == 400

    # Short new password (< 9 chars) should fail
    short_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": ADMIN_PASSWORD, "new_password": "Pass@12"})
    assert short_res.status_code == 400

    # Missing special char should fail
    no_special_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": ADMIN_PASSWORD, "new_password": "Password123"})
    assert no_special_res.status_code == 400

    # Missing digit should fail
    no_digit_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": ADMIN_PASSWORD, "new_password": "Password@!"})
    assert no_digit_res.status_code == 400

    # Successful change (>= 9 chars, letter, digit, special char)
    temp_pass = "TempSecretPass@123"
    ok_res = client.post("/api/auth/change-password", headers=headers, json={"old_password": ADMIN_PASSWORD, "new_password": temp_pass})
    assert ok_res.status_code == 200

    # Prior JWT token must now be rejected because token_version was incremented
    invalidated_res = client.get("/api/auth/me", headers=headers)
    assert invalidated_res.status_code == 401
    assert "Session has expired" in invalidated_res.json()["detail"] or "credentials" in invalidated_res.json()["detail"]

    # Login with new password
    new_login_res = client.post("/api/auth/login", data={"username": "admin", "password": temp_pass})
    assert new_login_res.status_code == 200
    new_token = new_login_res.json()["access_token"]
    new_headers = {"Authorization": f"Bearer {new_token}"}

    # Revert back to maintain consistency for other tests
    revert_res = client.post("/api/auth/change-password", headers=new_headers, json={"old_password": temp_pass, "new_password": ADMIN_PASSWORD})
    assert revert_res.status_code == 200

def test_departments_crud():
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": ADMIN_PASSWORD})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    get_res = client.get("/api/departments", headers=headers)
    assert get_res.status_code == 200
    depts = get_res.json()
    assert len(depts) >= 4

    dept_name = "DevOps & Cloud Engineering"
    create_res = client.post("/api/departments", headers=headers, json={"name": dept_name})
    assert create_res.status_code in [200, 201]
    created_dept = create_res.json()
    assert created_dept["name"] == dept_name
    dept_id = created_dept["id"]

    # Delete the created department
    delete_res = client.delete(f"/api/departments/{dept_id}", headers=headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["id"] == dept_id

    # Verify department no longer exists
    get_res2 = client.get("/api/departments", headers=headers)
    remaining_names = [d["name"] for d in get_res2.json()]
    assert dept_name not in remaining_names

def test_delete_department_with_assigned_employees_blocked():
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": ADMIN_PASSWORD})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    depts = client.get("/api/departments", headers=headers).json()
    eng_dept = next((d for d in depts if d["name"] == "Engineering"), None)
    if eng_dept:
        del_res = client.delete(f"/api/departments/{eng_dept['id']}", headers=headers)
        assert del_res.status_code == 400
        assert "cannot remove department" in del_res.json()["detail"].lower()

def test_employee_update():
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": ADMIN_PASSWORD})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    update_res = client.put(
        "/api/employees/EXP-101",
        headers=headers,
        json={"name": "Aarav Sharma Updated", "designation": "Staff Engineer"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Aarav Sharma Updated"

    client.put(
        "/api/employees/EXP-101",
        headers=headers,
        json={"name": "Aarav Sharma", "designation": "Lead Full-Stack Engineer"}
    )

def test_manual_attendance_add_and_correct():
    login_res = client.post("/api/auth/login", data={"username": "admin", "password": ADMIN_PASSWORD})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

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
