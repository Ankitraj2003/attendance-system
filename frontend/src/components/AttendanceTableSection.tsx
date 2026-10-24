import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Edit3,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Plus
} from 'lucide-react';
import { api } from '../api';
import { AttendanceRecord } from '../types';

interface AttendanceTableSectionProps {
  onSelectEmployeeForDashboard: (empId: string) => void;
}

export const AttendanceTableSection: React.FC<AttendanceTableSectionProps> = ({
  onSelectEmployeeForDashboard,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [department, setDepartment] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [missingOnly, setMissingOnly] = useState<boolean>(false);
  const [departmentsList, setDepartmentsList] = useState<string[]>([
    'Engineering', 'Product & Design', 'Marketing', 'Human Resources', 'Operations'
  ]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Manual Correction Modal State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [correctClassification, setCorrectClassification] = useState<string>('PRESENT');
  const [correctDayType, setCorrectDayType] = useState<string>('FULL_DAY');
  const [correctCheckInTime, setCorrectCheckInTime] = useState<string>('');
  const [correctCheckOutTime, setCorrectCheckOutTime] = useState<string>('');
  const [correctReason, setCorrectReason] = useState<string>('');
  const [correcting, setCorrecting] = useState<boolean>(false);
  const [correctionMsg, setCorrectionMsg] = useState<string | null>(null);

  // Manual Add Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newEmployeeId, setNewEmployeeId] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newClassification, setNewClassification] = useState<string>('PRESENT');
  const [newDayType, setNewDayType] = useState<string>('FULL_DAY');
  const [newCheckInTime, setNewCheckInTime] = useState<string>('10:00');
  const [newCheckOutTime, setNewCheckOutTime] = useState<string>('19:00');
  const [newReason, setNewReason] = useState<string>('');
  const [addingRecord, setAddingRecord] = useState<boolean>(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [depts, emps] = await Promise.all([
          api.getDepartments(),
          api.getEmployees(),
        ]);
        if (depts && depts.length > 0) {
          setDepartmentsList(depts.map((d: any) => d.name));
        }
        if (emps && emps.length > 0) {
          setEmployeesList(emps);
          if (!newEmployeeId) setNewEmployeeId(emps[0].employee_id);
        }
      } catch (err) {
        console.error('Failed to load departments or employees metadata', err);
      }
    };
    loadMetadata();
  }, []);

  const getLocalTimeString = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '';
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.getAttendanceRecords({
        page,
        limit,
        search: search || undefined,
        department: department !== 'ALL' ? department : undefined,
        status_filter: statusFilter !== 'ALL' ? statusFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        missing_checkout: missingOnly ? true : undefined,
      });
      setRecords(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load attendance records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, limit, department, statusFilter, missingOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const handleOpenCorrection = (r: AttendanceRecord) => {
    setEditingRecord(r);
    setCorrectClassification(r.attendance_classification);
    setCorrectDayType(r.day_type || 'FULL_DAY');
    setCorrectCheckInTime(getLocalTimeString(r.check_in_timestamp));
    setCorrectCheckOutTime(getLocalTimeString(r.check_out_timestamp));
    setCorrectReason('');
    setCorrectionMsg(null);
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord || !correctReason.trim()) return;

    try {
      setCorrecting(true);
      await api.correctRecord(editingRecord.id, {
        attendance_classification: correctClassification,
        day_type: correctDayType,
        check_in_time: correctCheckInTime || undefined,
        check_out_time: correctCheckOutTime || undefined,
        reason: correctReason,
      });
      setEditingRecord(null);
      await fetchRecords();
    } catch (err: any) {
      setCorrectionMsg(err.message || 'Failed to update record');
    } finally {
      setCorrecting(false);
    }
  };

  const handleSaveAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeId || !newDate || !newReason.trim()) {
      setAddMsg('Please specify employee, date, and mandatory audit reason.');
      return;
    }

    try {
      setAddingRecord(true);
      setAddMsg(null);
      await api.addManualAttendance({
        employee_id: newEmployeeId,
        attendance_date: newDate,
        attendance_classification: newClassification,
        day_type: newDayType,
        check_in_time: newClassification === 'ABSENT' ? undefined : (newCheckInTime || undefined),
        check_out_time: newClassification === 'ABSENT' ? undefined : (newCheckOutTime || undefined),
        reason: newReason,
      });
      setShowAddModal(false);
      setNewReason('');
      await fetchRecords();
    } catch (err: any) {
      setAddMsg(err.message || 'Failed to add manual attendance record');
    } finally {
      setAddingRecord(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const formatIST = (timestamp?: string) => {
    if (!timestamp) return '—';
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters Glass Card */}
      <div className="glass-panel rounded-2xl p-4 border border-white/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by employee name, ID, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs"
              />
            </div>

            {/* Department Filter */}
            <div className="w-full md:w-48">
              <select
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs cursor-pointer font-medium"
              >
                <option value="ALL">All Departments</option>
                {departmentsList.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-40">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs cursor-pointer font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ABSENT">Absent</option>
                <option value="ON_LEAVE">Approved Leave</option>
              </select>
            </div>

            <button
              type="submit"
              className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-xs transition-colors shrink-0"
            >
              Apply Filter
            </button>
          </div>

          {/* Secondary Filter Row: Dates & Missing Checkouts Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold text-[11px]">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="glass-input px-2.5 py-1 rounded-lg text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold text-[11px]">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="glass-input px-2.5 py-1 rounded-lg text-xs"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="cursor-pointer text-[11px] text-red-600 hover:underline font-semibold"
                >
                  Clear Dates
                </button>
              )}
            </div>

            {/* Missing Checkout Toggle */}
            <label className="cursor-pointer flex items-center gap-2 font-semibold text-slate-700 bg-amber-50/80 px-3 py-1 rounded-lg border border-amber-200">
              <input
                type="checkbox"
                checked={missingOnly}
                onChange={(e) => {
                  setMissingOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span className="text-[11px] text-amber-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Missing Check-Outs Only
              </span>
            </label>
          </div>
        </form>
      </div>

      {/* Main Attendance Records Table */}
      <div className="glass-panel rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-[#16194F]">Date-Wise Attendance Records</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-slate-100 text-slate-600">
              {total} Total Records
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowAddModal(true);
                setAddMsg(null);
              }}
              className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>

            <div className="text-xs text-slate-500 font-medium">
              Page {page} of {totalPages}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Day Type</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4 text-center">Duration</th>
                <th className="py-3 px-4 text-center">Exceptions</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-6 h-6 border-2 border-[#00A3E0] border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading attendance records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#16194F]">{r.employee_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{r.employee_id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{r.department}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">{r.attendance_date}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.attendance_classification === 'PRESENT'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : r.attendance_classification === 'HALF_DAY'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : r.attendance_classification === 'ON_LEAVE'
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {r.attendance_classification}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{r.day_type}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{formatIST(r.check_in_timestamp)}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{formatIST(r.check_out_timestamp)}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {r.recorded_working_duration ? `${r.recorded_working_duration} h` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {r.is_late && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                            title="Arrived after grace window"
                          >
                            Late
                          </span>
                        )}
                        {r.is_incomplete && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300"
                            title="Missing check-out timestamp"
                          >
                            Incomplete
                          </span>
                        )}
                        {r.is_manually_corrected && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300"
                            title={`Corrected: ${r.correction_reason}`}
                          >
                            Corrected
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenCorrection(r)}
                          className="cursor-pointer p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Administrative Record Correction"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onSelectEmployeeForDashboard(r.employee_id)}
                          className="cursor-pointer p-1.5 rounded-lg bg-[#16194F]/10 hover:bg-[#16194F] text-[#16194F] hover:text-white transition-all"
                          title="View Employee Dedicated Dashboard"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="font-mono font-bold text-slate-700 px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/90 shadow-2xl relative">
            <button
              onClick={() => setEditingRecord(null)}
              className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-[#16194F] mb-1 flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-500" />
              <span>Administrative Correction</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Updating {editingRecord.employee_name} ({editingRecord.employee_id}) on {editingRecord.attendance_date}.
              An audit entry will be logged.
            </p>

            {correctionMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">{correctionMsg}</div>
            )}

            <form onSubmit={handleSaveCorrection} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Status Classification *</label>
                <select
                  value={correctClassification}
                  onChange={(e) => setCorrectClassification(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="HALF_DAY">HALF_DAY</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Day Type</label>
                <select
                  value={correctDayType}
                  onChange={(e) => setCorrectDayType(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="FULL_DAY">Full Day</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Check-In Time</label>
                  <input
                    type="time"
                    value={correctCheckInTime}
                    onChange={(e) => setCorrectCheckInTime(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Check-Out Time</label>
                  <input
                    type="time"
                    value={correctCheckOutTime}
                    onChange={(e) => setCorrectCheckOutTime(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Mandatory Correction Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctReason}
                  onChange={(e) => setCorrectReason(e.target.value)}
                  placeholder="Enter audit rationale (e.g. Employee forgot to check-out; supervisor verified physical presence)..."
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={correcting}
                  className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-xs"
                >
                  {correcting ? 'Saving Audit...' : 'Confirm Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Attendance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-white/90 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-[#16194F] mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Add Attendance Record</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Manually add or backfill an attendance record for an employee. An audit trail will be logged.
            </p>

            {addMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">{addMsg}</div>
            )}

            <form onSubmit={handleSaveAddAttendance} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Employee *</label>
                <select
                  required
                  value={newEmployeeId}
                  onChange={(e) => setNewEmployeeId(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                >
                  {employeesList.map((emp) => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.name} ({emp.employee_id}) — {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Attendance Date *</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Status Classification *</label>
                  <select
                    value={newClassification}
                    onChange={(e) => setNewClassification(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="HALF_DAY">HALF_DAY</option>
                    <option value="ABSENT">ABSENT</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Day Type</label>
                  <select
                    value={newDayType}
                    onChange={(e) => setNewDayType(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <option value="FULL_DAY">Full Day</option>
                    <option value="HALF_DAY">Half Day</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Check-In Time</label>
                  <input
                    type="time"
                    disabled={newClassification === 'ABSENT'}
                    value={newCheckInTime}
                    onChange={(e) => setNewCheckInTime(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Check-Out Time</label>
                <input
                  type="time"
                  disabled={newClassification === 'ABSENT'}
                  value={newCheckOutTime}
                  onChange={(e) => setNewCheckOutTime(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  required
                  rows={2}
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Enter audit rationale (e.g. Employee card reader failure; manual attendance verified)..."
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingRecord}
                  className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-xs"
                >
                  {addingRecord ? 'Adding...' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
