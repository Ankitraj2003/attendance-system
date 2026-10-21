import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Power,
  Search,
  Building,
  Mail,
  Calendar,
  X,
  Briefcase
} from 'lucide-react';
import { api } from '../api';
import { Employee } from '../types';

interface EmployeeManagementSectionProps {
  onSelectEmployeeForDashboard: (empId: string) => void;
  onOpenPortalWithToken: (token: string) => void;
}

export const EmployeeManagementSection: React.FC<EmployeeManagementSectionProps> = ({
  onSelectEmployeeForDashboard,
  onOpenPortalWithToken,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [department, setDepartment] = useState<string>('ALL');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New Employee Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_number: '',
    name: '',
    work_email: '',
    department: 'Engineering',
    designation: '',
    date_of_joining: new Date().toISOString().split('T')[0],
    employment_status: 'FULL_TIME',
    weekly_off_days: 'Saturday,Sunday',
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployees(department !== 'ALL' ? department : undefined);
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [department]);

  const handleCopyLink = (token: string) => {
    const origin = window.location.origin;
    const url = `${origin}/#portal?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleToggleStatus = async (empId: string) => {
    if (!window.confirm('Change employment account status? (Deactivated employees cannot submit attendance).')) {
      return;
    }
    try {
      await api.toggleEmployeeStatus(empId);
      await fetchEmployees();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegenerateToken = async (empId: string) => {
    if (!window.confirm('Revoke old link and issue a fresh security token for this employee?')) {
      return;
    }
    try {
      await api.regenerateEmployeeToken(empId);
      await fetchEmployees();
      alert('New attendance link generated successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg(null);
      await api.createEmployee(formData);
      setShowAddModal(false);
      setFormData({
        employee_id: '',
        employee_number: '',
        name: '',
        work_email: '',
        department: 'Engineering',
        designation: '',
        date_of_joining: new Date().toISOString().split('T')[0],
        employment_status: 'FULL_TIME',
        weekly_off_days: 'Saturday,Sunday',
      });
      await fetchEmployees();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.employee_id.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      emp.work_email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/80">
        <div>
          <h2 className="text-lg font-bold text-[#16194F] tracking-tight">Employee Directory & Identities</h2>
          <p className="text-xs text-slate-500">Manage workforce accounts, shifts, and secure attendance links</p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="glass-input px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product & Design">Product & Design</option>
            <option value="Marketing">Marketing</option>
            <option value="Human Resources">Human Resources</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#F5BE2C]" />
            <span>Register Employee</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search by name, employee ID, role or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs"
        />
      </div>

      {/* Employee List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="animate-spin w-6 h-6 border-2 border-[#00A3E0] border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading employee directory...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 italic glass-panel rounded-2xl">
            No employees match your search criteria.
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className={`glass-card rounded-2xl p-5 border shadow-2xs hover:shadow-md transition-all flex flex-col justify-between ${
                emp.account_status === 'ACTIVE'
                  ? 'border-white/80'
                  : 'border-slate-200 bg-slate-100/50 opacity-70'
              }`}
            >
              <div>
                {/* Header & Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#16194F] to-[#1E2568] text-[#F5BE2C] font-bold flex items-center justify-center text-sm shadow-xs">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#16194F]">{emp.name}</h3>
                      <span className="text-[11px] font-mono font-semibold text-slate-500">
                        {emp.employee_id}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.account_status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}
                  >
                    {emp.account_status}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-600 mb-4 pt-1">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-[#00A3E0] shrink-0" />
                    <span className="truncate">{emp.department} &bull; {emp.designation}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{emp.work_email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Joined: {emp.date_of_joining}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Copy attendance portal link */}
                <button
                  onClick={() => handleCopyLink(emp.token_secret)}
                  className={`cursor-pointer px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                    copiedToken === emp.token_secret
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white/80 hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                  title="Copy permanent employee attendance link"
                >
                  {copiedToken === emp.token_secret ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Test portal directly */}
                  <button
                    onClick={() => onOpenPortalWithToken(emp.token_secret)}
                    className="cursor-pointer p-1.5 rounded-lg text-slate-500 hover:text-[#00A3E0] hover:bg-cyan-50"
                    title="Launch Portal as this employee"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  {/* Regenerate Token */}
                  <button
                    onClick={() => handleRegenerateToken(emp.employee_id)}
                    className="cursor-pointer p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                    title="Revoke & regenerate security link"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  {/* Deactivate/Activate */}
                  <button
                    onClick={() => handleToggleStatus(emp.employee_id)}
                    className={`cursor-pointer p-1.5 rounded-lg transition-colors ${
                      emp.account_status === 'ACTIVE'
                        ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                    title={emp.account_status === 'ACTIVE' ? 'Deactivate Employee' : 'Activate Employee'}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  {/* Open Individual Dashboard */}
                  <button
                    onClick={() => onSelectEmployeeForDashboard(emp.employee_id)}
                    className="cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-2xs transition-colors"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-white/90 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#16194F] mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              <span>Register New Employee</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Generates a secure identity and a reusable daily attendance link automatically.
            </p>

            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">{errorMsg}</div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EXP-106"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Employee Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP006"
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Sen"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ananya.sen@expandit.com"
                  value={formData.work_email}
                  onChange={(e) => setFormData({ ...formData, work_email: e.target.value })}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Department *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Frontend Specialist"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Date of Joining *</label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_joining}
                    onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Employment Status</label>
                  <select
                    value={formData.employment_status}
                    onChange={(e) => setFormData({ ...formData, employment_status: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
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
                  disabled={saving}
                  className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-xs"
                >
                  {saving ? 'Registering...' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
