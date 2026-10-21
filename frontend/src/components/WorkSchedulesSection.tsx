import React, { useState, useEffect } from 'react';
import { Clock, Calendar, ShieldAlert, CheckCircle2, Building } from 'lucide-react';
import { api } from '../api';
import { WorkSchedule } from '../types';

export const WorkSchedulesSection: React.FC = () => {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([api.getSchedules(), api.getHolidays()])
      .then(([s, h]) => {
        setSchedules(s);
        setHolidays(h);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#16194F] text-[#00A3E0]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#16194F] tracking-tight">Work Shifts & Corporate Calendar</h2>
            <p className="text-xs text-slate-500">
              Configured work shifts, grace period rules, overtime thresholds, and official holidays
            </p>
          </div>
        </div>
      </div>

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
        <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
          <h3 className="text-sm font-bold text-[#16194F] mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#F5BE2C]" />
            <span>Official Company Holidays (2026)</span>
          </h3>

          <div className="divide-y divide-slate-100">
            {holidays.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-[#16194F] block">{h.description}</span>
                  <span className="text-[11px] font-mono text-slate-400">{h.holiday_date}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  {h.holiday_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
