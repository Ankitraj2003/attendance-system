import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Building2,
  Clock,
  AlertTriangle,
  Award,
  Filter,
  Calendar,
  Layers
} from 'lucide-react';
import { api } from '../api';

export const AnalyticsSection: React.FC = () => {
  const [trendInterval, setTrendInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [trends, setTrends] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [leaveStats, setLeaveStats] = useState<any[]>([]);
  const [employeeRanking, setEmployeeRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [trendRes, deptRes, leaveRes, rankRes] = await Promise.all([
        api.getTrends(undefined, undefined, trendInterval),
        api.getDepartmentAnalytics(),
        api.getLeaveAnalytics(),
        api.getEmployeeRanking(),
      ]);
      setTrends(trendRes);
      setDepartments(deptRes);
      setLeaveStats(leaveRes);
      setEmployeeRanking(rankRes);
    } catch (err) {
      console.error('Failed to load analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [trendInterval]);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-3 border-[#00A3E0] border-t-transparent rounded-full mx-auto mb-3"></div>
        Synthesizing Enterprise Analytics & Insights...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/80">
        <div>
          <h2 className="text-lg font-bold text-[#16194F] tracking-tight">Workforce Analytics & Deep Insights</h2>
          <p className="text-xs text-slate-500">
            Real-time trends, department benchmarks, hours calculations, and exception rates
          </p>
        </div>

        {/* Interval Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200">
          {(['daily', 'weekly', 'monthly'] as const).map((inv) => (
            <button
              key={inv}
              onClick={() => setTrendInterval(inv)}
              className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                trendInterval === inv
                  ? 'bg-white text-[#16194F] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {inv}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Row 1: Attendance Trends & Department Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line Chart */}
        <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#16194F]">Workforce Attendance Trendlines</h3>
              <p className="text-xs text-slate-400">Time-series tracking of presence, late arrivals & absences</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[#00A3E0]" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="present"
                  name="Present"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="absent"
                  name="Absent"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="late"
                  name="Late Arrivals"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department-Wise Attendance Rate Bar Chart */}
        <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#16194F]">Department Attendance Benchmark</h3>
              <p className="text-xs text-slate-400">Attendance percentages and headcount comparison</p>
            </div>
            <Building2 className="w-4 h-4 text-[#F5BE2C]" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departments} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis dataKey="department" type="category" width={110} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Attendance Rate']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="attendance_rate" name="Attendance Rate" fill="#16194F" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart Row 2: Leave Breakdown & Working-Hours Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leave Distribution Stacked Bar */}
        <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#16194F]">Leave Distribution by Type</h3>
              <p className="text-xs text-slate-400">Status distribution across PL, CL, and Medical Leave</p>
            </div>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="approved" name="Approved" fill="#10B981" stackId="a" />
                <Bar dataKey="pending" name="Pending" fill="#F5BE2C" stackId="a" />
                <Bar dataKey="rejected" name="Rejected" fill="#EF4444" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Working Hours Trendline */}
        <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#16194F]">Average Daily Working Hours</h3>
              <p className="text-xs text-slate-400">Calculated from validated check-in & check-out pairs</p>
            </div>
            <Clock className="w-4 h-4 text-[#00A3E0]" />
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis domain={[0, 12]} unit="h" tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} hrs`, 'Average Duration']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_hours"
                  name="Avg Hours Worked"
                  stroke="#00A3E0"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Employee Attendance Comparison Table (Section 5.3.I) */}
      <div className="glass-panel rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#16194F] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#F5BE2C]" />
              <span>Employee Attendance Comparison & Performance Matrix</span>
            </h3>
            <p className="text-xs text-slate-400">
              Ranked overview of logged attendance days, absence counts, late arrivals, and total hours
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4 text-center">Present Days</th>
                <th className="py-3 px-4 text-center">Absent Days</th>
                <th className="py-3 px-4 text-center">Late Arrivals</th>
                <th className="py-3 px-4 text-right">Total Hours</th>
                <th className="py-3 px-4 text-right">Avg Daily Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employeeRanking.map((emp) => (
                <tr key={emp.employee_id} className="hover:bg-white/60">
                  <td className="py-3 px-4">
                    <div className="font-bold text-[#16194F]">{emp.name}</div>
                    <div className="text-[10px] font-mono text-slate-400">{emp.employee_id}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">{emp.department}</td>
                  <td className="py-3 px-4 text-slate-500">{emp.designation}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700">
                    {emp.present_days}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-red-600">
                    {emp.absent_days}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-amber-600">
                    {emp.late_arrivals}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                    {emp.total_hours} h
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700">
                    {emp.avg_hours} h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
