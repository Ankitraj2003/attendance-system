const BASE_URL = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('expandit_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('expandit_auth_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('expandit_auth_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred';
    try {
      const data = await response.json();
      errorDetail = data.detail || errorDetail;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  async login(username: string, password: string) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  async getMe() {
    return request<any>('/auth/me');
  },

  // Portal Attendance
  async getPortalInfo(token: string) {
    return request<any>(`/attendance/portal/${token}`);
  },

  async portalCheckIn(token: string, dayType: string = 'FULL_DAY') {
    return request<any>(`/attendance/portal/${token}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ day_type: dayType }),
    });
  },

  async portalCheckOut(token: string) {
    return request<any>(`/attendance/portal/${token}/check-out`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async portalSubmitLeave(token: string, formData: FormData) {
    return request<any>(`/leaves/portal/${token}/submit`, {
      method: 'POST',
      body: formData,
    });
  },

  // Admin Attendance
  async getAttendanceRecords(params: Record<string, any>) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    return request<any>(`/attendance/records?${query.toString()}`);
  },

  async correctRecord(recordId: number, data: any) {
    return request<any>(`/attendance/records/${recordId}/correct`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Employees
  async getEmployees(department?: string, statusFilter?: string) {
    const q = new URLSearchParams();
    if (department) q.append('department', department);
    if (statusFilter) q.append('status_filter', statusFilter);
    return request<any[]>(`/employees?${q.toString()}`);
  },

  async createEmployee(data: any) {
    return request<any>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateEmployee(employeeId: string, data: any) {
    return request<any>(`/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async toggleEmployeeStatus(employeeId: string) {
    return request<any>(`/employees/${employeeId}/toggle-status`, {
      method: 'POST',
    });
  },

  async regenerateEmployeeToken(employeeId: string) {
    return request<any>(`/employees/${employeeId}/regenerate-token`, {
      method: 'POST',
    });
  },

  async getEmployeeDashboard(employeeId: string, startDate?: string, endDate?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    return request<any>(`/employees/${employeeId}/dashboard?${q.toString()}`);
  },

  // Leaves
  async getLeaves(params: Record<string, any> = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return request<any[]>(`/leaves?${q.toString()}`);
  },

  async processLeaveDecision(requestId: number, data: { status: string; decision_remarks?: string; rejection_reason?: string }) {
    return request<any>(`/leaves/${requestId}/decision`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Analytics
  async getKPIs(startDate?: string, endDate?: string, department?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    if (department) q.append('department', department);
    return request<any>(`/analytics/kpis?${q.toString()}`);
  },

  async getDistribution(targetDate?: string, department?: string) {
    const q = new URLSearchParams();
    if (targetDate) q.append('target_date', targetDate);
    if (department) q.append('department', department);
    return request<any[]>(`/analytics/distribution?${q.toString()}`);
  },

  async getTrends(startDate?: string, endDate?: string, interval: string = 'daily', department?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    if (interval) q.append('interval', interval);
    if (department) q.append('department', department);
    return request<any[]>(`/analytics/trends?${q.toString()}`);
  },

  async getDepartmentAnalytics(startDate?: string, endDate?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    return request<any[]>(`/analytics/departments?${q.toString()}`);
  },

  async getLeaveAnalytics(startDate?: string, endDate?: string, department?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    if (department) q.append('department', department);
    return request<any[]>(`/analytics/leaves?${q.toString()}`);
  },

  async getEmployeeRanking(startDate?: string, endDate?: string, department?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    if (department) q.append('department', department);
    return request<any[]>(`/analytics/ranking?${q.toString()}`);
  },

  async getExceptions() {
    return request<any>('/analytics/exceptions');
  },

  async getAuditLogs(limit: number = 50) {
    return request<any[]>(`/analytics/audit-logs?limit=${limit}`);
  },

  async getSchedules() {
    return request<any[]>('/schedules');
  },

  async getHolidays() {
    return request<any[]>('/schedules/holidays');
  },

  // Export URLs
  getCompanyExcelUrl(startDate?: string, endDate?: string, department?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    if (department) q.append('department', department);
    return `${BASE_URL}/reports/company/excel?${q.toString()}`;
  },

  getCompanyCsvUrl(startDate?: string, endDate?: string, department?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    if (department) q.append('department', department);
    return `${BASE_URL}/reports/company/csv?${q.toString()}`;
  },

  getEmployeeExcelUrl(employeeId: string, startDate?: string, endDate?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    return `${BASE_URL}/reports/employee/${employeeId}/excel?${q.toString()}`;
  },

  getEmployeeCsvUrl(employeeId: string, startDate?: string, endDate?: string) {
    const q = new URLSearchParams();
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    return `${BASE_URL}/reports/employee/${employeeId}/csv?${q.toString()}`;
  },

  getAttachmentDownloadUrl(attachmentId: number) {
    return `${BASE_URL}/attachments/${attachmentId}/download`;
  }
};
