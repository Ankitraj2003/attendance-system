import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  FileCheck2,
  FileQuestion,
  FileX,
  TrendingUp,
  Percent,
  Timer,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Building,
  RefreshCw
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../api';
import { KPIData } from '../types';

interface OverviewSectionProps {
  onNavigateToTab: (tab: string) => void;
  onSelectEmployeeForDashboard?: (empId: string) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  onNavigateToTab,
  onSelectEmployeeForDashboard,
}) => {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [distribution, setDistribution] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [departmentsList, setDepartmentsList] = useState<string[]>([
    'Engineering', 'Product & Design', 'Marketing', 'Human Resources', 'Operations'
  ]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [kpis, dist, trends, exc] = await Promise.all([
        api.getKPIs(undefined, undefined, selectedDept),
        api.getDistribution(undefined, selectedDept),
        api.getTrends(undefined, undefined, 'daily', selectedDept),
        api.getExceptions(),
      ]);
      setKpiData(kpis);
      setDistribution(dist);
      setTrendData(trends);
      setExceptions(exc);
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDept]);

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const depts = await api.getDepartments();
        if (depts && depts.length > 0) {
          setDepartmentsList(depts.map((d: any) => d.name));
        }
      } catch (e) {
        console.error('Failed to load departments', e);
      }
    };
    loadDepts();
  }, []);

  if (loading || !kpiData) {
    return (
      <div className="py-20 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-3 border-[#00A3E0] border-t-transparent rounded-full mx-auto mb-3"></div>
        Loading Workforce Metrics...
      </div>
    );
  }

  // 12 Top-Level KPIs defined in PDF Section 5.2
  const kpiCards = [
    {
      label: 'Total Active Workforce',
      value: kpiData.total_active_employees,
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50/70',
      border: 'border-indigo-100',
    },
    {
      label: 'Present Employees',
      value: kpiData.present_employees,
      sub: `${kpiData.attendance_rate}% Attendance Rate`,
      icon: UserCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-100',
      diff: kpiData.comparison?.present_diff,
    },
    {
      label: 'Full-Day Attendance',
      value: kpiData.full_day_attendance,
      sub: 'Standard Shifts',
      icon: Clock,
      color: 'text-[#00A3E0]',
      bg: 'bg-cyan-50/70',
      border: 'border-cyan-100',
    },
    {
      label: 'Half-Day Attendance',
      value: kpiData.half_day_attendance,
      sub: 'Partial shifts recorded',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50/70',
      border: 'border-amber-100',
    },
    {
      label: 'Absent Employees',
      value: kpiData.absent_employees,
      sub: `${kpiData.absence_rate}% Absence Rate`,
      icon: UserX,
      color: 'text-red-600',
      bg: 'bg-red-50/70',
      border: 'border-red-100',
    },
    {
      label: 'Currently Checked In',
      value: kpiData.currently_checked_in,
      sub: 'Active in office/remote',
      icon: Timer,
      color: 'text-teal-600',
      bg: 'bg-teal-50/70',
      border: 'border-teal-100',
    },
    {
      label: 'Checked Out Today',
      value: kpiData.checked_out_employees,
      sub: 'Workday completed',
      icon: UserCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-50/70',
      border: 'border-blue-100',
    },
    {
      label: 'Pending Leave Requests',
      value: kpiData.pending_leave_requests,
      sub: 'Awaiting admin decision',
      icon: FileQuestion,
      color: 'text-amber-600',
      bg: 'bg-amber-50/70',
      border: 'border-amber-100',
      actionTab: 'leaves',
    },
    {
      label: 'Approved Leaves',
      value: kpiData.approved_leave_requests,
      sub: 'Verified with documents',
      icon: FileCheck2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-100',
    },
    {
      label: 'Rejected Leaves',
      value: kpiData.rejected_leave_requests,
      sub: 'Documented in audit history',
      icon: FileX,
      color: 'text-rose-600',
      bg: 'bg-rose-50/70',
      border: 'border-rose-100',
    },
    {
      label: 'Missing Check-Outs',
      value: kpiData.missing_check_outs,
      sub: 'Action required for review',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50/70',
      border: 'border-amber-200',
      isWarning: kpiData.missing_check_outs > 0,
      actionTab: 'attendance',
    },
    {
      label: 'Late Arrivals',
      value: kpiData.late_arrivals,
      sub: 'After shift grace window',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bg: 'bg-orange-50/70',
      border: 'border-orange-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/80">
        <div>
          <h2 className="text-lg font-bold text-[#16194F] tracking-tight">Workforce Executive Overview</h2>
          <p className="text-xs text-slate-500">Real-time attendance state, metrics and exceptions</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departmentsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}



            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="cursor-pointer p-2 rounded-xl bg-white/80 hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs transition-all"
            title="Refresh Real-time Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#00A3E0]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 12 Dynamic Top-Level KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => card.actionTab && onNavigateToTab(card.actionTab)}
              className={`glass-card rounded-2xl p-4 border ${card.border} shadow-2xs hover:shadow-md transition-all ${
                card.actionTab ? 'cursor-pointer hover:border-amber-400/80' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                  {card.label}
                </span>
                <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-[#16194F] font-mono">
                  {card.value}
                </span>

                {card.diff !== undefined && (
                  <span
                    className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded ${
                      card.diff >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {card.diff >= 0 ? (
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-0.5" />
                    )}
                    {Math.abs(card.diff)}
                  </span>
                )}
              </div>

              {card.sub && (
                <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  {card.sub}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Analytical Working-Hours Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="glass-card rounded-2xl p-4 border border-white/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Average Daily Work Hours</span>
            <span className="text-xl font-black text-[#16194F] block font-mono mt-0.5">
              {kpiData.average_working_hours} <span className="text-xs font-normal text-slate-500">hrs/employee</span>
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-100 text-amber-800">
            <Timer className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Logged Workforce Hours</span>
            <span className="text-xl font-black text-[#16194F] block font-mono mt-0.5">
              {kpiData.total_working_hours} <span className="text-xs font-normal text-slate-500">hrs</span>
            </span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-100 text-cyan-800">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Incomplete Records Flagged</span>
            <span className="text-xl font-black text-[#16194F] block font-mono mt-0.5">
              {kpiData.incomplete_records} <span className="text-xs font-normal text-slate-500">records</span>
            </span>
          </div>
          <div className="p-3 rounded-xl bg-red-100 text-red-800">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Distribution Chart */}
        <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#16194F]">Daily Attendance Distribution</h3>
              <p className="text-xs text-slate-400">Current status breakdown across active personnel</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-mono bg-slate-100 text-slate-600 font-semibold">
              Today
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="category"
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 14-Day Attendance Trend Line */}
        <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#16194F]">Workforce Attendance Trend</h3>
              <p className="text-xs text-slate-400">Present vs. Absent trendlines over time</p>
            </div>
            <button
              onClick={() => onNavigateToTab('analytics')}
              className="cursor-pointer text-xs font-semibold text-[#00A3E0] hover:underline"
            >
              Detailed Analytics &rarr;
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
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
                <Area
                  type="monotone"
                  dataKey="present"
                  name="Present Personnel"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPresent)"
                />
                <Area
                  type="monotone"
                  dataKey="absent"
                  name="Absent / Leave"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAbsent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Exception Highlights */}
      {exceptions && (
        <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-[#16194F]">High-Priority Operational Exceptions</h3>
                <p className="text-xs text-slate-400">Items requiring administrative audit or review</p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab('attendance')}
              className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
            >
              Open Review Queue
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Missing Checkouts */}
            <div className="bg-white/70 rounded-xl p-3.5 border border-slate-200/60">
              <span className="font-bold text-slate-700 block mb-2 flex items-center justify-between">
                <span>Missing Check-Outs ({exceptions.missing_checkouts?.length || 0})</span>
                <span className="text-[10px] font-normal text-slate-400">Past dates with check-in only</span>
              </span>
              {exceptions.missing_checkouts?.length === 0 ? (
                <p className="text-slate-400 italic">No missing checkouts found.</p>
              ) : (
                <div className="space-y-2">
                  {exceptions.missing_checkouts.slice(0, 3).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <span className="font-bold text-[#16194F] block">{item.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {item.employee_id} &bull; {item.department} &bull; {item.date}
                        </span>
                      </div>
                      <button
                        onClick={() => onSelectEmployeeForDashboard && onSelectEmployeeForDashboard(item.employee_id)}
                        className="cursor-pointer text-[10px] font-semibold text-[#00A3E0] hover:underline"
                      >
                        Inspect &rarr;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Late Arrivals */}
            <div className="bg-white/70 rounded-xl p-3.5 border border-slate-200/60">
              <span className="font-bold text-slate-700 block mb-2 flex items-center justify-between">
                <span>Recent Late Arrivals ({exceptions.late_arrivals?.length || 0})</span>
                <span className="text-[10px] font-normal text-slate-400">Beyond 15-minute grace</span>
              </span>
              {exceptions.late_arrivals?.length === 0 ? (
                <p className="text-slate-400 italic">No late arrivals logged.</p>
              ) : (
                <div className="space-y-2">
                  {exceptions.late_arrivals.slice(0, 3).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <span className="font-bold text-[#16194F] block">{item.name}</span>
                        <span className="text-[10px] text-slate-500">
                          {item.employee_id} &bull; {item.department} &bull; {item.date}
                        </span>
                      </div>
                      <button
                        onClick={() => onSelectEmployeeForDashboard && onSelectEmployeeForDashboard(item.employee_id)}
                        className="cursor-pointer text-[10px] font-semibold text-[#00A3E0] hover:underline"
                      >
                        Inspect &rarr;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
