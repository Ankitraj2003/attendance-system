import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  CalendarDays
} from 'lucide-react';
import { api } from '../api';
import { WorkSchedule } from '../types';

interface HolidayItem {
  id: number;
  holiday_date: string;
  description: string;
  holiday_type: string;
}

export const WorkSchedulesSection: React.FC = () => {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Holiday management state
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newDate, setNewDate] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newType, setNewType] = useState<string>('COMPANY');
  const [savingHoliday, setSavingHoliday] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [s, h] = await Promise.all([api.getSchedules(), api.getHolidays()]);
      setSchedules(s);
      setHolidays(h);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to load schedule and holiday data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newDescription.trim()) {
      setErrorMsg('Please specify both the date and holiday description.');
      return;
    }

    try {
      setSavingHoliday(true);
      setErrorMsg(null);
      await api.addHoliday({
        holiday_date: newDate,
        description: newDescription.trim(),
        holiday_type: newType,
      });
      setSuccessMsg(`Official holiday "${newDescription}" added to calendar.`);
      setShowAddModal(false);
      setNewDate('');
      setNewDescription('');
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add company holiday');
    } finally {
      setSavingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove the holiday "${name}" from the corporate calendar?`)) {
      return;
    }

    try {
      setErrorMsg(null);
      await api.deleteHoliday(id);
      setSuccessMsg(`Holiday removed successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove holiday');
    }
  };

  // Filter holidays by selected year
  const filteredHolidays = holidays.filter((h) => {
    if (selectedYear === 'ALL') return true;
    return h.holiday_date.startsWith(selectedYear);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#16194F] text-[#00A3E0]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#16194F] tracking-tight">Work Shifts &amp; Corporate Calendar</h2>
            <p className="text-xs text-slate-500">
              Set whole-year official company holidays, shift timings, grace periods, and work rules
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setNewDate(`${selectedYear === 'ALL' ? new Date().getFullYear() : selectedYear}-01-01`);
            setShowAddModal(true);
          }}
          className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4 text-[#F5BE2C]" />
          <span>Add Company Holiday</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="cursor-pointer text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedules Card */}
        <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
          <h3 className="text-sm font-bold text-[#16194F] mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00A3E0]" />
            <span>Configured Work Schedules</span>
          </h3>

          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="p-4 rounded-xl bg-white/70 border border-slate-200/60 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm text-[#16194F]">{s.schedule_name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Active Shift
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Timing:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {s.start_time} - {s.end_time} IST
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Late Grace:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {s.late_arrival_threshold_minutes} minutes
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Full Day Min:</span>
                    <span className="font-mono font-bold text-slate-700">{s.minimum_hours_full_day} hrs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Half Day Min:</span>
                    <span className="font-mono font-bold text-slate-700">{s.minimum_hours_half_day} hrs</span>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <strong>Working Days:</strong> {s.working_days}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Corporate Holidays List */}
        <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#16194F] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#F5BE2C]" />
              <span>Official Company Holidays</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {filteredHolidays.length} Days
              </span>
            </h3>

            {/* Year filter selector so admin can plan whole year ahead */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="glass-input px-2.5 py-1 rounded-lg text-xs font-bold text-[#16194F] cursor-pointer"
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2025">2025</option>
                <option value="ALL">All Years</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mb-3">
            Holidays configured here automatically waive absence penalties on official company off-days.
          </p>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[380px] pr-1">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <div className="animate-spin w-5 h-5 border-2 border-[#00A3E0] border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading holiday calendar...
              </div>
            ) : filteredHolidays.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">
                No holidays scheduled for {selectedYear === 'ALL' ? 'the selected view' : selectedYear}.
                <div className="mt-2">
                  <button
                    onClick={() => {
                      setNewDate(`${selectedYear === 'ALL' ? 2026 : selectedYear}-01-01`);
                      setShowAddModal(true);
                    }}
                    className="cursor-pointer text-[#00A3E0] font-semibold underline hover:text-[#0284C7]"
                  >
                    Set holidays for this year
                  </button>
                </div>
              </div>
            ) : (
              filteredHolidays.map((h) => (
                <div key={h.id} className="py-3 flex items-center justify-between gap-2 hover:bg-white/50 px-2 rounded-xl transition-colors">
                  <div>
                    <span className="font-bold text-xs text-[#16194F] block">{h.description}</span>
                    <span className="text-[11px] font-mono text-slate-500 font-medium">{h.holiday_date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        h.holiday_type === 'NATIONAL'
                          ? 'bg-blue-100 text-blue-800'
                          : h.holiday_type === 'REGIONAL'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {h.holiday_type}
                    </span>
                    <button
                      onClick={() => handleDeleteHoliday(h.id, h.description)}
                      className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remove Holiday"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Holiday Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/90 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#16194F] mb-1 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#F5BE2C]" />
              <span>Schedule Company Holiday</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a declared holiday to the official corporate annual schedule.
            </p>

            <form onSubmit={handleAddHoliday} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Holiday Date *</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Holiday Name / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Republic Day, Diwali, Annual Company Off"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Holiday Category</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer text-slate-700"
                >
                  <option value="NATIONAL">National Holiday (Mandatory)</option>
                  <option value="COMPANY">Company Holiday (Corporate Off)</option>
                  <option value="REGIONAL">Festival / Regional Holiday</option>
                  <option value="OPTIONAL">Optional / Restricted Holiday</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHoliday}
                  className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-sm transition-all"
                >
                  {savingHoliday ? 'Saving...' : 'Add to Calendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
