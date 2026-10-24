from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, Float, 
    Text, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="EMPLOYEE", nullable=False) # ADMIN, EMPLOYEE
    account_status = Column(String(50), default="ACTIVE", nullable=False) # ACTIVE, INACTIVE
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    employee = relationship("Employee", back_populates="user", uselist=False)

class WorkSchedule(Base):
    __tablename__ = "work_schedules"

    id = Column(Integer, primary_key=True, index=True)
    schedule_name = Column(String(100), unique=True, nullable=False)
    start_time = Column(String(10), default="10:00", nullable=False) # HH:MM (10:00 AM)
    end_time = Column(String(10), default="19:00", nullable=False)   # HH:MM (07:00 PM)
    working_days = Column(String(255), default="Monday,Tuesday,Wednesday,Thursday,Friday,Saturday", nullable=False)
    late_arrival_threshold_minutes = Column(Integer, default=15, nullable=False)
    minimum_hours_full_day = Column(Float, default=8.0, nullable=False)
    minimum_hours_half_day = Column(Float, default=4.0, nullable=False)
    is_overnight = Column(Boolean, default=False, nullable=False)
    effective_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    employees = relationship("Employee", back_populates="schedule")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False) # e.g. EXP001
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    employee_number = Column(String(50), unique=True, nullable=False)
    name = Column(String(150), nullable=False, index=True)
    work_email = Column(String(255), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=False, index=True)
    designation = Column(String(100), nullable=False)
    date_of_joining = Column(Date, nullable=False)
    date_of_exit = Column(Date, nullable=True) # Automatically stamped when deactivated
    employment_status = Column(String(50), default="FULL_TIME", nullable=False) # FULL_TIME, PART_TIME, CONTRACT
    account_status = Column(String(50), default="ACTIVE", nullable=False) # ACTIVE, INACTIVE
    token_secret = Column(String(100), unique=True, index=True, nullable=False) # Reusable secure personal link
    assigned_schedule_id = Column(Integer, ForeignKey("work_schedules.id", ondelete="SET NULL"), nullable=True)
    weekly_off_days = Column(String(100), default="Sunday", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="employee")
    schedule = relationship("WorkSchedule", back_populates="employees")
    attendance_records = relationship("AttendanceRecord", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    attachments = relationship("AttendanceAttachment", back_populates="employee", cascade="all, delete-orphan")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_date = Column(Date, nullable=False, index=True)
    attendance_classification = Column(String(50), nullable=False, default="PRESENT") # PRESENT, ABSENT, HALF_DAY, ON_LEAVE
    day_type = Column(String(50), nullable=False, default="FULL_DAY") # FULL_DAY, HALF_DAY
    check_in_timestamp = Column(DateTime(timezone=True), nullable=True)
    check_out_timestamp = Column(DateTime(timezone=True), nullable=True)
    recorded_working_duration = Column(Float, nullable=True) # in decimal hours
    is_late = Column(Boolean, default=False, nullable=False)
    is_early_departure = Column(Boolean, default=False, nullable=False)
    is_incomplete = Column(Boolean, default=False, nullable=False) # check-in without check-out or vice versa
    is_manually_corrected = Column(Boolean, default=False, nullable=False)
    correction_reason = Column(String(255), nullable=True)
    corrected_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    schedule_id = Column(Integer, ForeignKey("work_schedules.id", ondelete="SET NULL"), nullable=True)
    related_leave_id = Column(Integer, ForeignKey("leave_requests.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("employee_id", "attendance_date", name="uq_employee_attendance_date"),
        Index("idx_att_emp_date", "employee_id", "attendance_date"),
        Index("idx_att_date_status", "attendance_date", "attendance_classification"),
    )

    employee = relationship("Employee", back_populates="attendance_records")
    schedule = relationship("WorkSchedule")
    related_leave = relationship("LeaveRequest", back_populates="attendance_records")

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type = Column(String(50), nullable=False) # PL, CL, MEDICAL
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False, index=True) # PENDING, APPROVED, REJECTED
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_timestamp = Column(DateTime(timezone=True), nullable=True)
    decision_remarks = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    employee = relationship("Employee", back_populates="leave_requests")
    reviewer = relationship("User")
    attachments = relationship("AttendanceAttachment", back_populates="leave_request", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="related_leave")

class AttendanceAttachment(Base):
    __tablename__ = "attendance_attachments"

    id = Column(Integer, primary_key=True, index=True)
    leave_request_id = Column(Integer, ForeignKey("leave_requests.id", ondelete="CASCADE"), nullable=True)
    employee_id = Column(String(50), ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), unique=True, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    employee = relationship("Employee", back_populates="attachments")
    leave_request = relationship("LeaveRequest", back_populates="attachments")

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True)
    holiday_date = Column(Date, unique=True, nullable=False, index=True)
    description = Column(String(200), nullable=False)
    scope_department = Column(String(100), default="ALL", nullable=False)
    holiday_type = Column(String(50), default="PUBLIC", nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_role = Column(String(50), default="ADMIN", nullable=False) # ADMIN, EMPLOYEE
    recipient_id = Column(String(50), nullable=True)
    event_type = Column(String(50), nullable=False) # CHECK_IN, CHECK_OUT, LEAVE_REQUEST, LEAVE_DECISION, EXCEPTION
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(String(50), nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String(100), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False) # CORRECTION, APPROVAL, REJECTION, EMPLOYEE_UPDATE, etc.
    entity_type = Column(String(50), nullable=False) # ATTENDANCE, LEAVE, EMPLOYEE
    entity_id = Column(String(100), nullable=False)
    before_values = Column(Text, nullable=True) # JSON
    after_values = Column(Text, nullable=True)  # JSON
    reason = Column(Text, nullable=True)
    ip_address = Column(String(100), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
