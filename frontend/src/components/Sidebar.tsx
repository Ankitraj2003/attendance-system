import React from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  UserCheck,
  FileText,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  pendingLeavesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  pendingLeavesCount = 0,
}) => {
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance Management', icon: CalendarCheck },
    { id: 'employees', label: 'Employee Management', icon: Users },
    { id: 'individual-dashboards', label: 'Individual Dashboards', icon: UserCheck },
    {
      id: 'leaves',
      label: 'Leave Management',
      icon: FileText,
      badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
    },
    { id: 'calendar', label: 'Attendance Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics & Insights', icon: BarChart3 },
    { id: 'reports', label: 'Reports & Downloads', icon: FileSpreadsheet },
    { id: 'schedules', label: 'Work Schedules', icon: Clock },
    { id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  ];

  return (
    <aside
      className={`relative z-30 transition-all duration-300 ease-in-out glass-panel border-r border-white/60 flex flex-col justify-between shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top nav items */}
      <div className="py-4 px-3 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`cursor-pointer w-full flex items-center rounded-xl px-3 py-2.5 transition-all text-xs font-semibold group ${
                isActive
                  ? 'bg-gradient-to-r from-[#16194F] to-[#1E2568] text-white shadow-md shadow-indigo-950/10'
                  : 'text-slate-600 hover:text-[#16194F] hover:bg-white/80'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform ${
                  isActive ? 'text-[#F5BE2C]' : 'text-slate-400 group-hover:text-[#00A3E0]'
                }`}
              />

              {!collapsed && (
                <span className="ml-3 truncate tracking-tight">{item.label}</span>
              )}

              {item.badge !== undefined && (
                <span
                  className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-[#F5BE2C] text-[#16194F]'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle Footer */}
      <div className="p-3 border-t border-slate-200/50 flex items-center justify-between">
        {!collapsed && (
          <div className="px-2">
            <span className="text-[11px] font-semibold text-slate-400 block">Version 1.0</span>
            <span className="text-[10px] text-slate-400">Expandit Core</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="cursor-pointer p-2 rounded-lg bg-white/70 hover:bg-slate-100 text-slate-500 hover:text-slate-800 shadow-2xs border border-slate-200/60 transition-colors mx-auto"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
