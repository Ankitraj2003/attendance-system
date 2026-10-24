from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime

# Token & Auth
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    role: str
    account_status: str

# Work Schedule
class WorkScheduleBase(BaseModel):
    schedule_name: str
    start_time: str = "10:00"
    end_time: str = "19:00"
    working_days: str = "Monday,Tuesday,Wednesday,Thursday,Friday,Saturday"
    late_arrival_threshold_minutes: int = 15
    minimum_hours_full_day: float = 8.0
    minimum_hours_half_day: float = 4.0
    is_overnight: bool = False

class WorkScheduleResponse(WorkScheduleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime

# Employee
class EmployeeBase(BaseModel):
    employee_id: str
    employee_number: str
    name: str
    work_email: EmailStr
    department: str
    designation: str
    date_of_joining: date
    date_of_exit: Optional[date] = None
    employment_status: str = "FULL_TIME"
    account_status: str = "ACTIVE"
    weekly_off_days: str = "Sunday"
    assigned_schedule_id: Optional[int] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    work_email: Optional[EmailStr] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    date_of_joining: Optional[date] = None
    employment_status: Optional[str] = None
    account_status: Optional[str] = None
    weekly_off_days: Optional[str] = None
    date_of_exit: Optional[date] = None
    assigned_schedule_id: Optional[int] = None

class EmployeeResponse(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    token_secret: str
    created_at: datetime
    schedule: Optional[WorkScheduleResponse] = None

class EmployeePortalInfo(BaseModel):
    employee_id: str
    name: str
    department: str
    designation: str
    date_of_joining: date
    current_date: date
    server_time: str
    assigned_schedule: Optional[str] = None
    schedule_start: str = "10:00"
    schedule_end: str = "19:00"
    is_holiday: bool = False
    holiday_name: Optional[str] = None
    is_weekly_off: bool = False
    off_day_name: Optional[str] = None
    monthly_hours_worked: float = 0.0
    monthly_target_hours: float = 160.0
    has_achievement_badge: bool = False
    achievement_title: Optional[str] = None
    today_record: Optional[Dict[str, Any]] = None
    recent_records: List[Dict[str, Any]] = []
    month_records: List[Dict[str, Any]] = []

# Attendance
class CheckInRequest(BaseModel):
    day_type: str = Field(default="FULL_DAY", description="FULL_DAY or HALF_DAY")
    idempotency_key: Optional[str] = None

class CheckOutRequest(BaseModel):
    idempotency_key: Optional[str] = None

class ManualCorrectionRequest(BaseModel):
    attendance_classification: Optional[str] = None
    day_type: Optional[str] = None
    check_in_timestamp: Optional[datetime] = None
    check_out_timestamp: Optional[datetime] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    reason: str

class ManualAddAttendanceRequest(BaseModel):
    employee_id: str
    attendance_date: date
    attendance_classification: str = "PRESENT"
    day_type: str = "FULL_DAY"
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    reason: str

class DepartmentCreate(BaseModel):
    name: str

class DepartmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    created_at: datetime

class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: str
    employee_name: Optional[str] = None
    department: Optional[str] = None
    attendance_date: date
    attendance_classification: str
    day_type: str
    check_in_timestamp: Optional[datetime] = None
    check_out_timestamp: Optional[datetime] = None
    recorded_working_duration: Optional[float] = None
    is_late: bool
    is_early_departure: bool
    is_incomplete: bool
    is_manually_corrected: bool
    correction_reason: Optional[str] = None
    related_leave_id: Optional[int] = None

# Leaves
class LeaveRequestCreate(BaseModel):
    leave_type: str = Field(..., description="PL, CL, MEDICAL")
    start_date: date
    end_date: date
    reason: str

class LeaveDecisionRequest(BaseModel):
    status: str = Field(..., description="APPROVED or REJECTED")
    decision_remarks: Optional[str] = None
    rejection_reason: Optional[str] = None

class LeaveRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: str
    employee_name: Optional[str] = None
    department: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    reason: str
    status: str
    decision_remarks: Optional[str] = None
    rejection_reason: Optional[str] = None
    review_timestamp: Optional[datetime] = None
    created_at: datetime
    attachments: List[Dict[str, Any]] = []

# Analytics & KPIs
class KPICardData(BaseModel):
    total_active_employees: int
    present_employees: int
    full_day_attendance: int
    half_day_attendance: int
    absent_employees: int
    currently_checked_in: int
    checked_out_employees: int
    pending_leave_requests: int
    approved_leave_requests: int
    rejected_leave_requests: int
    missing_check_outs: int
    late_arrivals: int
    attendance_rate: float
    absence_rate: float
    average_working_hours: float
    total_working_hours: float
    incomplete_records: int
    comparison: Optional[Dict[str, Any]] = None

# Audit Log Response
class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    actor: str
    actor_role: str
    action: str
    entity_type: str
    entity_id: str
    before_values: Optional[str] = None
    after_values: Optional[str] = None
    reason: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime
