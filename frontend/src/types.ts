export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  account_status: string;
}

export interface WorkSchedule {
  id: number;
  schedule_name: string;
  start_time: string;
  end_time: string;
  working_days: string;
  late_arrival_threshold_minutes: number;
  minimum_hours_full_day: number;
  minimum_hours_half_day: number;
  is_overnight: boolean;
  effective_date?: string;
}

export interface Employee {
  id: number;
  employee_id: string;
  employee_number: string;
  name: string;
  work_email: string;
  department: string;
  designation: string;
  date_of_joining: string;
  date_of_exit?: string;
  employment_status: string;
  account_status: string;
  token_secret: string;
  weekly_off_days: string;
  assigned_schedule_id?: number;
  schedule?: WorkSchedule;
}

export interface AttendanceRecord {
  id: number;
  employee_id: string;
  employee_name?: string;
  department?: string;
  attendance_date: string;
  attendance_classification: string;
  day_type: string;
  check_in_timestamp?: string;
  check_out_timestamp?: string;
  recorded_working_duration?: number;
  is_late: boolean;
  is_early_departure: boolean;
  is_incomplete: boolean;
  is_manually_corrected: boolean;
  correction_reason?: string;
  related_leave_id?: number;
}

export interface LeaveAttachment {
  id: number;
  original_filename: string;
  file_size: number;
  mime_type: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: string;
  employee_name?: string;
  department?: string;
  leave_type: 'PL' | 'CL' | 'MEDICAL';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decision_remarks?: string;
  rejection_reason?: string;
  created_at: string;
  attachments: LeaveAttachment[];
}

export interface KPIData {
  total_active_employees: number;
  present_employees: number;
  full_day_attendance: number;
  half_day_attendance: number;
  absent_employees: number;
  currently_checked_in: number;
  checked_out_employees: number;
  pending_leave_requests: number;
  approved_leave_requests: number;
  rejected_leave_requests: number;
  missing_check_outs: number;
  late_arrivals: number;
  attendance_rate: number;
  absence_rate: number;
  average_working_hours: number;
  total_working_hours: number;
  incomplete_records: number;
  comparison?: {
    present_diff: number;
    prev_period_label: string;
  };
}

export interface PortalInfo {
  employee_id: string;
  name: string;
  department: string;
  designation: string;
  date_of_joining: string;
  current_date: string;
  server_time: string;
  assigned_schedule: string;
  schedule_start: string;
  schedule_end: string;
  is_holiday?: boolean;
  holiday_name?: string;
  is_weekly_off?: boolean;
  off_day_name?: string;
  is_approved_leave?: boolean;
  approved_leave_type?: string;
  monthly_hours_worked?: number;
  monthly_target_hours?: number;
  has_achievement_badge?: boolean;
  achievement_title?: string;
  today_record?: {
    id: number;
    status: string;
    day_type: string;
    check_in?: string;
    check_out?: string;
    is_checked_in: boolean;
    is_checked_out: boolean;
    duration?: number;
    is_late: boolean;
    description?: string;
    is_approved_leave?: boolean;
  };
  recent_records: Array<{
    date: string;
    status: string;
    check_in: string;
    check_out: string;
    duration: number;
  }>;
  month_records?: Array<{
    date: string;
    status: string;
    check_in: string;
    check_out: string;
    duration: number;
  }>;
}

export interface CalendarDay {
  date: string;
  day_number: number;
  day_name: string;
  status: string;
  is_holiday: boolean;
  holiday_description?: string;
  is_weekly_off: boolean;
  check_in?: string;
  check_out?: string;
  duration?: number;
  is_incomplete: boolean;
  is_late: boolean;
}

export interface IndividualDashboardData {
  profile: {
    employee_id: string;
    employee_number: string;
    name: string;
    work_email: string;
    department: string;
    designation: string;
    date_of_joining: string;
    employment_status: string;
    account_status: string;
    weekly_off_days: string;
    schedule: string;
  };
  kpis: {
    recorded_present_days: number;
    full_days: number;
    half_days: number;
    absence_records: number;
    pl_requests: number;
    cl_requests: number;
    medical_requests: number;
    approved_leaves: number;
    pending_leaves: number;
    rejected_leaves: number;
    total_working_hours: number;
    average_daily_working_hours: number;
    late_arrivals: number;
    missing_check_outs: number;
  };
  attendance_history: AttendanceRecord[];
  leave_history: LeaveRequest[];
  calendar: CalendarDay[];
}

export interface AuditLog {
  id: number;
  actor: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_values?: string;
  after_values?: string;
  reason?: string;
  ip_address?: string;
  timestamp: string;
}
