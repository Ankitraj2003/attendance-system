import React, { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  Clock,
  Building,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  FileDown,
  TrendingUp,
  Download,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { api } from '../api';
import { IndividualDashboardData, Employee } from '../types';

interface IndividualEmployeeDashboardProps {
  selectedEmployeeId?: string;
  onBackToDirectory?: () => void;
}

export const IndividualEmployeeDashboard: React.FC<IndividualEmployeeDashboardProps> = ({
  selectedEmployeeId = 'EXP-101',
  onBackToDirectory,
}) => {
  const [employeeId, setEmployeeId] = useState<string>(selectedEmployeeId);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [data, setData] = useState<IndividualDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exporting, setExporting] = useState<'EXCEL' | 'CSV' | null>(null);

  useEffect(() => {
    if (selectedEmployeeId) {
      setEmployeeId(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  // Load employee directory for dropdown
  useEffect(() => {
    api.getEmployees().then(setEmployeesList).catch(console.error);
  }, []);

  const fetchDashboardData = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const res = await api.getEmployeeDashboard(
        employeeId,
        startDate || undefined,
        endDate || undefined
      );
      setData(res);
    } catch (err) {
      console.error('Failed to load employee dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [employeeId, startDate, endDate]);

  const handleExportExcel = async () => {
    try {
      setExporting('EXCEL');
      const url = api.getEmployeeExcelUrl(employeeId, startDate || undefined, endDate || undefined);
      await api.downloadFile(url, `Expandit_Attendance_${employeeId}.xlsx`);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting('CSV');
      const url = api.getEmployeeCsvUrl(employeeId, startDate || undefined, endDate || undefined);
      await api.downloadFile(url, `Expandit_Attendance_${employeeId}.csv`);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const formatIST = (timestamp?: string) => {
    if (!timestamp) return 'â€”';
    try {
      return new Date(timestamp).toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'â€”';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/80">
        <div className="flex items-center gap-3">
          {onBackToDirectory && (
            <button
              onClick={onBackToDirectory}
              className="cursor-pointer p-2 rounded-xl bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
              title="Return to Employee Directory"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#16194F] tracking-tight">
                Dedicated Employee Dashboard
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-indigo-600" />
                Admin View Only
              </span>
            </div>
            <p className="text-xs text-slate-500">
              In-depth individual attendance analytics, monthly calendar, and single-employee exports
            </p>
          </div>
        </div>

        {/* Employee Switcher Dropdown & Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="glass-input px-3 py-2 rounded-xl text-xs font-bold text-[#16194F] cursor-pointer"
          >
            {employeesList.map((emp) => (
              <option key={emp.employee_id} value={emp.employee_id}>
                {emp.name} ({emp.employee_id}) - {emp.department}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportExcel}
            disabled={exporting !== null}
            className="cursor-pointer px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white shadow-xs transition-colors flex items-center gap-1.5"
            title="Download individual Excel report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{exporting === 'EXCEL' ? 'Exporting...' : 'Export Excel'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting !== null}
            className="cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold bg-white/80 hover:bg-slate-50 disabled:opacity-60 text-slate-700 border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5"
            title="Download individual CSV"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{exporting === 'CSV' ? 'Exporting...' : 'CSV'}</span>
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-3 border-[#00A3E0] border-t-transparent rounded-full mx-auto mb-3"></div>
          Loading employee analytical records...
        </div>
      ) : (
        <>
          {/* Profile Card & Highlights */}
          <div className="glass-card rounded-2xl p-5 border border-white/90 shadow-2xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#16194F] to-[#1E2568] text-[#F5BE2C] font-black text-xl flex items-center justify-center shadow-sm">
                  {data.profile.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#16194F]">{data.profile.name}</h3>
                    <span className="text-xs font-mono font-bold text-slate-500 px-2 py-0.5 rounded bg-slate-100">
                      {data.profile.employee_id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        data.profile.account_status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {data.profile.account_status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <strong>Role:</strong> {data.profile.designation}
                    </span>
                    <span>
                      <strong>Department:</strong> {data.profile.department}
                    </span>
                    <span>
                      <strong>Shift:</strong> {data.profile.schedule}
                    </span>
                    <span>
                      <strong>Weekly Offs:</strong> {data.profile.weekly_off_days}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Individual Employee 12 KPIs Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Present Days', val: data.kpis.recorded_present_days, color: 'text-emerald-600' },
              { label: 'Full Days', val: data.kpis.full_days, color: 'text-teal-600' },
              { label: 'Half Days', val: data.kpis.half_days, color: 'text-amber-600' },
              { label: 'Absence Records', val: data.kpis.absence_records, color: 'text-red-600' },
              { label: 'Late Arrivals', val: data.kpis.late_arrivals, color: 'text-orange-600' },
              { label: 'Missing Check-Outs', val: data.kpis.missing_check_outs, color: 'text-rose-600' },
              { label: 'Total Hours Worked', val: `${data.kpis.total_working_hours} h`, color: 'text-indigo-600' },
              { label: 'Avg Daily Hours', val: `${data.kpis.average_daily_working_hours} h`, color: 'text-blue-600' },
              { label: 'PL Requests', val: data.kpis.pl_requests, color: 'text-slate-700' },
              { label: 'CL Requests', val: data.kpis.cl_requests, color: 'text-slate-700' },
              { label: 'Medical Requests', val: data.kpis.medical_requests, color: 'text-slate-700' },
              { label: 'Approved Leaves', val: data.kpis.approved_leaves, color: 'text-emerald-600' },
            ].map((kpi, idx) => (
              <div key={idx} className="glass-card rounded-xl p-3 border border-white/80 shadow-2xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                  {kpi.label}
                </span>
                <span className={`text-lg font-black font-mono mt-0.5 block ${kpi.color}`}>
                  {kpi.val}
                </span>
              </div>
            ))}
          </div>

          {/* Monthly Attendance Calendar Matrix */}
          <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#16194F] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#00A3E0]" />
                  <span>Monthly Attendance Calendar</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Color-coded daily status indicators including holidays, weekends and incomplete entries
                </p>
              </div>

              {/* Legend */}
              <div className="hidden sm:flex items-center gap-3 text-[10px] font-semibold">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Present
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Half Day
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Absent
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span> Leave
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Holiday
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Off Day
                </span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center font-bold text-[11px] text-slate-400 uppercase py-1">
                  {d}
                </div>
              ))}

              {data.calendar && data.calendar.length > 0 && Array.from({
                length: new Date(data.calendar[0].date + 'T00:00:00').getDay()
              }).map((_, i) => (
                <div key={`empty-cell-${i}`} className="rounded-xl p-2.5 border border-transparent bg-transparent" />
              ))}

              {data.calendar.map((c) => {
                let badgeClass = 'bg-slate-50 text-slate-400 border-slate-200';
                if (c.status === 'PRESENT') badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
                else if (c.status === 'HALF_DAY') badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                else if (c.status === 'ABSENT') badgeClass = 'bg-red-100 text-red-900 border-red-300 font-bold';
                else if (c.status === 'ON_LEAVE') badgeClass = 'bg-cyan-100 text-cyan-900 border-cyan-300 font-bold';
                else if (c.is_holiday) badgeClass = 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
                else if (c.is_weekly_off) badgeClass = 'bg-slate-100 text-slate-500 border-slate-200';

                return (
                  <div
                    key={c.date}
                    className={`rounded-xl p-2.5 border text-center transition-all ${badgeClass} ${
                      c.is_incomplete ? 'ring-2 ring-rose-400' : ''
                    }`}
                  >
                    <span className="text-xs font-mono block">{c.day_number}</span>
                    <span className="text-[9px] uppercase tracking-wider block mt-0.5 truncate font-semibold">
                      {c.is_holiday ? c.holiday_description || 'Holiday' : c.status}
                    </span>
                    {c.duration ? (
                      <span className="text-[10px] font-mono block text-slate-600 mt-0.5">
                        {c.duration}h
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attendance History & Leave History Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Date-wise Attendance History */}
            <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
              <h3 className="text-sm font-bold text-[#16194F] mb-3">Attendance History</h3>
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold sticky top-0 bg-white/90">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Check-In</th>
                      <th className="pb-2">Check-Out</th>
                      <th className="pb-2 text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.attendance_history.map((r) => (
                      <tr key={r.id} className="hover:bg-white/60">
                        <td className="py-2 font-mono text-slate-700">{r.attendance_date}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.attendance_classification === 'PRESENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.attendance_classification === 'HALF_DAY'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {r.attendance_classification}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-slate-600">{formatIST(r.check_in_timestamp)}</td>
                        <td className="py-2 font-mono text-slate-600">{formatIST(r.check_out_timestamp)}</td>
                        <td className="py-2 text-right font-mono font-bold text-slate-800">
                          {r.recorded_working_duration ? `${r.recorded_working_duration}h` : 'â€”'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Leave History Table */}
            <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
              <h3 className="text-sm font-bold text-[#16194F] mb-3">Leave History & Supporting Documents</h3>
              <div className="overflow-x-auto max-h-72">
                {data.leave_history.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">
                    No leave requests on file for this employee.
                  </p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold sticky top-0 bg-white/90">
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Dates</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Reason</th>
                        <th className="pb-2 text-right">Document</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.leave_history.map((l) => (
                        <tr key={l.id} className="hover:bg-white/60">
                          <td className="py-2 font-bold text-[#16194F]">{l.leave_type}</td>
                          <td className="py-2 font-mono text-slate-600 text-[11px]">
                            {l.start_date} to {l.end_date}
                          </td>
                          <td className="py-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                l.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : l.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {l.status}
                            </span>
                          </td>
                          <td className="py-2 text-slate-600 max-w-xs truncate" title={l.reason}>
                            {l.reason}
                          </td>
                          <td className="py-2 text-right">
                            {l.attachments && l.attachments.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => api.downloadAttachment(l.attachments[0].id, l.attachments[0].original_filename)}
                                className="cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold text-[#00A3E0] hover:underline"
                                title="Download uploaded medical/supporting document securely"
                              >
                                <Download className="w-3 h-3" />
                                <span>Doc</span>
                              </button>
                            ) : (
                              'â€”'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
