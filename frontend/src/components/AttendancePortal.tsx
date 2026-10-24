import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  LogOut,
  LogIn,
  AlertCircle,
  FileUp,
  X,
  Building2,
  User,
  History,
  Award,
  Sun,
  Coffee,
  Sparkles
} from 'lucide-react';
import { api } from '../api';
import { PortalInfo } from '../types';

interface AttendancePortalProps {
  initialToken?: string;
  onClose?: () => void;
}

export const AttendancePortal: React.FC<AttendancePortalProps> = ({
  initialToken = '',
  onClose,
}) => {
  const [portalData, setPortalData] = useState<PortalInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [dayType, setDayType] = useState<string>('FULL_DAY');
  const [historyTab, setHistoryTab] = useState<'MONTH' | 'RECENT'>('MONTH');

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [leaveType, setLeaveType] = useState<'PL' | 'CL' | 'MEDICAL'>('CL');
  const [leaveStartDate, setLeaveStartDate] = useState<string>('');
  const [leaveEndDate, setLeaveEndDate] = useState<string>('');
  const [leaveReason, setLeaveReason] = useState<string>('');
  const [leaveFile, setLeaveFile] = useState<File | null>(null);

  const fetchPortalInfo = async () => {
    if (!initialToken) {
      setErrorMsg('Invalid or missing employee token. Please use your personal attendance link.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await api.getPortalInfo(initialToken);
      setPortalData(data);
      if (data.current_date) {
        setLeaveStartDate(data.current_date);
        setLeaveEndDate(data.current_date);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load employee attendance portal');
      setPortalData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalInfo();
  }, [initialToken]);

  const handleCheckIn = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await api.portalCheckIn(initialToken, dayType);
      setSuccessMsg(res.message || 'Check-in recorded successfully!');
      await fetchPortalInfo();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm('Are you sure you want to Check Out for the day?')) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await api.portalCheckOut(initialToken);
      setSuccessMsg(
        `Check-out recorded! Total working duration: ${res.recorded_working_duration || 0} hrs.`
      );
      await fetchPortalInfo();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveFile) {
      setErrorMsg('Please upload a supporting document (PDF, PNG, or JPG).');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const formData = new FormData();
      formData.append('leave_type', leaveType);
      formData.append('start_date', leaveStartDate);
      formData.append('end_date', leaveEndDate);
      formData.append('reason', leaveReason);
      formData.append('document', leaveFile);
      const res = await api.portalSubmitLeave(initialToken, formData);
      setSuccessMsg(res.message || 'Leave request submitted for administrative review.');
      setShowLeaveModal(false);
      setLeaveReason('');
      setLeaveFile(null);
      await fetchPortalInfo();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const todayRec = portalData?.today_record;
  const isCheckedIn = Boolean(todayRec?.is_checked_in);
  const isCheckedOut = Boolean(todayRec?.is_checked_out);

  const isHoliday = Boolean(portalData?.is_holiday);
  const isWeeklyOff = Boolean(portalData?.is_weekly_off);
  const isOffDay = (isHoliday || isWeeklyOff) && !isCheckedIn;

  // Records to display in history table
  const displayedRecords =
    historyTab === 'MONTH'
      ? (portalData?.month_records && portalData.month_records.length > 0 ? portalData.month_records : portalData?.recent_records || [])
      : (portalData?.recent_records || []);

  const monthlyHours = portalData?.monthly_hours_worked || 0;
  const targetHours = portalData?.monthly_target_hours || 0;
  const hasBadge = Boolean(portalData?.has_achievement_badge);

  return (
    <div className="max-w-3xl mx-auto py-3 sm:py-4 px-3 sm:px-6">
      <div className="glass-panel rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 relative overflow-hidden border border-white/70 shadow-lg">
        {onClose && (
          <button
            onClick={onClose}
            className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full bg-white/70 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Achievement Badge (Upper Corner) */}
        {hasBadge && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-600/15 border border-amber-300/80 shadow-sm flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 shadow-sm">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  🏆 {portalData?.achievement_title || `Target Achieved: ${targetHours}+ Monthly Hours!`}
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                </span>
                <p className="text-[11px] text-amber-900 font-medium">
                  Outstanding effort and dedication! You have logged{' '}
                  <strong className="font-extrabold">{monthlyHours} hrs</strong> (Target: {targetHours} hrs) this month.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-400 text-amber-950 shadow-2xs">
              Star Performer
            </span>
          </div>
        )}

        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="Expandit" className="h-10 w-auto object-contain rounded-md shadow-xs" />
            <div>
              <h2 className="text-xl font-bold text-[#16194F] flex items-center gap-2">
                Employee Attendance Portal
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Secure Identity
                </span>
              </h2>
              <p className="text-xs text-slate-500">Daily Check-In, Check-Out &amp; Leave Submission</p>
            </div>
          </div>

          {/* Monthly Hours Counter Pill */}
          {portalData && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-200/80 text-xs font-semibold text-[#16194F]">
              <Clock className="w-3.5 h-3.5 text-[#00A3E0]" />
              <span>This Month:</span>
              <span className="font-mono font-black text-[#16194F]">
                {monthlyHours} <span className="text-[10px] font-normal text-slate-500">/ {targetHours} hrs</span>
              </span>
            </div>
          )}
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50/90 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div>{errorMsg}</div>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div>{successMsg}</div>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            <div className="animate-spin w-8 h-8 border-3 border-[#00A3E0] border-t-transparent rounded-full mx-auto mb-3"></div>
            Authenticating employee portal session...
          </div>
        ) : portalData ? (
          <>
            {/* Employee Profile Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-white/70 border border-white/80 shadow-2xs mb-4 sm:mb-6">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Employee</span>
                <span className="text-xs font-bold text-[#16194F] flex items-center gap-1 mt-0.5">
                  <User className="w-3.5 h-3.5 text-amber-500" />
                  {portalData.name}
                </span>
                <span className="text-[10px] font-mono text-slate-500 font-semibold">{portalData.employee_id}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Department</span>
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-[#00A3E0]" />
                  {portalData.department}
                </span>
                <span className="text-[10px] text-slate-500 truncate block">{portalData.designation}</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Shift Timing</span>
                <span className="text-xs font-semibold text-slate-700 mt-0.5 block">
                  {portalData.schedule_start} – {portalData.schedule_end}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">10:00 AM – 7:00 PM (15m grace)</span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Server Date</span>
                <span className="text-xs font-bold text-[#16194F] flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  {portalData.current_date}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 font-semibold">{portalData.server_time}</span>
              </div>
            </div>

            {/* Daily Attendance Action Box / Off-Day Banner */}
            {isOffDay ? (
              <div className="glass-card rounded-2xl p-4 sm:p-6 border border-white/90 shadow-sm text-center">
                {isHoliday ? (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Sun className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-[#16194F] block">
                        Today is an Official Holiday: {portalData.holiday_name}
                      </span>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Company is closed for the holiday. Attendance, check-in, check-out, and leave applications are waived today.
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Paid Company Holiday
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Coffee className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-[#16194F] block">
                        Today is {portalData.off_day_name} (Weekly Off)
                      </span>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Sunday is the scheduled corporate off-day. No check-in or work required today. Have a restful day off!
                      </p>
                    </div>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
                        Scheduled Weekly Off
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-4 sm:p-6 border border-white/90 shadow-sm text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold mb-4 bg-slate-100 text-slate-700 border border-slate-200">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Today's Record:</span>
                  <span
                    className={`font-extrabold uppercase ${
                      todayRec?.status === 'PRESENT' ? 'text-emerald-600'
                      : todayRec?.status === 'HALF_DAY' ? 'text-amber-600'
                      : todayRec?.status === 'ABSENT' || todayRec?.status === 'ON_LEAVE' ? 'text-red-600'
                      : todayRec?.status === 'HOLIDAY' || todayRec?.status === 'WEEKLY_OFF' ? 'text-blue-600'
                      : 'text-slate-500'
                    }`}
                  >
                    {todayRec?.status || 'Not Yet Submitted'}
                  </span>
                </div>

                {isCheckedIn && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-left grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Check-In Time:</span>
                      <span className="font-bold text-emerald-800 text-sm">{todayRec?.check_in}</span>
                      {todayRec?.is_late && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold border border-amber-300">
                          Late Arrival
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Check-Out Time:</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {isCheckedOut ? todayRec?.check_out : '— Pending Check-Out —'}
                      </span>
                      {isCheckedOut && todayRec?.duration !== undefined && (
                        <span className="block text-[11px] text-emerald-700 font-semibold mt-0.5">
                          Duration: {todayRec.duration} hrs
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {!isCheckedIn ? (
                    <div>
                      <div className="flex justify-center gap-3 mb-4">
                        {(['FULL_DAY', 'HALF_DAY'] as const).map((dt) => (
                          <label
                            key={dt}
                            className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                              dayType === dt
                                ? 'bg-[#16194F] text-white border-[#16194F] shadow-sm'
                                : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="dayType"
                              value={dt}
                              checked={dayType === dt}
                              onChange={() => setDayType(dt)}
                              className="sr-only"
                            />
                            <span>{dt === 'FULL_DAY' ? 'Full Day' : 'Half Day'} Attendance</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <button
                          onClick={handleCheckIn}
                          disabled={submitting}
                          className="cursor-pointer flex-1 py-3 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>{submitting ? 'Recording...' : 'Record Check-In (Present)'}</span>
                        </button>
                        <button
                          onClick={() => setShowLeaveModal(true)}
                          className="cursor-pointer py-3 px-5 rounded-xl font-bold text-sm bg-white/90 hover:bg-red-50 text-red-600 border border-red-200 transition-all flex items-center justify-center gap-2"
                        >
                          <FileUp className="w-4 h-4" />
                          <span>Mark Absent / Leave</span>
                        </button>
                      </div>
                    </div>
                  ) : !isCheckedOut ? (
                    <button
                      onClick={handleCheckOut}
                      disabled={submitting}
                      className="cursor-pointer w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-[#00A3E0] to-[#0284C7] hover:from-[#0284C7] hover:to-[#0369A1] text-white shadow-md shadow-cyan-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{submitting ? 'Recording...' : 'Complete Workday & Check-Out'}</span>
                    </button>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Attendance finalized for today. Your record is securely saved.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Attendance History (1 Month & 7 Days Toggle) */}
            <div className="mt-6 glass-card rounded-2xl p-5 border border-white/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-xs font-bold text-[#16194F] uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#00A3E0]" />
                  <span>Attendance History</span>
                </h3>

                {/* View Tabs: 1 Month vs 7 Days */}
                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
                  <button
                    onClick={() => setHistoryTab('MONTH')}
                    className={`cursor-pointer px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      historyTab === 'MONTH'
                        ? 'bg-[#16194F] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    This Month ({portalData.month_records?.length || 0} Records)
                  </button>
                  <button
                    onClick={() => setHistoryTab('RECENT')}
                    className={`cursor-pointer px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      historyTab === 'RECENT'
                        ? 'bg-[#16194F] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Last 7 Days
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white/95 backdrop-blur-xs">
                    <tr className="border-b border-slate-200/60 text-slate-400 font-semibold">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Check-In</th>
                      <th className="pb-2">Check-Out</th>
                      <th className="pb-2 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                          No attendance records found for this period.
                        </td>
                      </tr>
                    ) : (
                      displayedRecords.map((r, idx) => (
                        <tr key={idx} className="hover:bg-white/60">
                          <td className="py-2.5 font-mono text-slate-700">{r.date}</td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'PRESENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'HALF_DAY'
                                  ? 'bg-amber-100 text-amber-800'
                                  : r.status === 'HOLIDAY' || r.status === 'WEEKLY_OFF'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-slate-600">{r.check_in}</td>
                          <td className="py-2.5 font-mono text-slate-600">{r.check_out}</td>
                          <td className="py-2.5 text-right font-mono font-semibold text-slate-700">
                            {r.duration > 0 ? `${r.duration} hrs` : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Leave Submission Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-4 sm:p-6 border border-white/90 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowLeaveModal(false)}
              className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-[#16194F] mb-1 flex items-center gap-2">
              <FileUp className="w-5 h-5 text-amber-500" />
              <span>Submit Leave Request / Mark Absent</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              All requests require a supporting document and administrator approval.
            </p>
            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Leave Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CL', label: 'Casual Leave (CL)' },
                    { id: 'PL', label: 'Privilege Leave (PL)' },
                    { id: 'MEDICAL', label: 'Medical Leave' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLeaveType(t.id as any)}
                      className={`cursor-pointer py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                        leaveType === t.id
                          ? 'bg-[#16194F] text-white border-[#16194F]'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Explain the detailed purpose or medical circumstances..."
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Supporting Document * (PDF, JPG, PNG &lt; 5MB)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-amber-400 transition-colors bg-white/50">
                  <input
                    type="file"
                    required
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setLeaveFile(e.target.files[0]);
                    }}
                    className="cursor-pointer w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200"
                  />
                  {leaveFile && (
                    <p className="mt-2 text-[11px] font-semibold text-emerald-600">
                      Selected: {leaveFile.name} ({(leaveFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-sm transition-all"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
