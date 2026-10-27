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
  Briefcase,
  LayoutGrid,
  List,
  LogOut,
  Clock,
  Edit3,
  Plus,
  Trash2
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
  const [copiedEmpId, setCopiedEmpId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Dynamic Departments
  const [departmentsList, setDepartmentsList] = useState<string[]>([
    'Engineering', 'Product & Design', 'Marketing', 'Human Resources', 'Operations'
  ]);
  const [departmentsData, setDepartmentsData] = useState<{ id: number; name: string }[]>([]);
  const [showAddDeptModal, setShowAddDeptModal] = useState<boolean>(false);
  const [newDeptName, setNewDeptName] = useState<string>('');
  const [creatingDept, setCreatingDept] = useState<boolean>(false);
  const [deletingDeptId, setDeletingDeptId] = useState<number | null>(null);
  const [deptErrorMsg, setDeptErrorMsg] = useState<string | null>(null);
  const [deptSuccessMsg, setDeptSuccessMsg] = useState<string | null>(null);

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
    weekly_off_days: 'Sunday',
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Employee Modal
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    work_email: '',
    department: 'Engineering',
    designation: '',
    date_of_joining: '',
    account_status: 'ACTIVE',
  });
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  const fetchDepartments = async () => {
    try {
      const depts = await api.getDepartments();
      if (depts && depts.length > 0) {
        setDepartmentsData(depts);
        setDepartmentsList(depts.map((d: any) => d.name));
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const handleDeleteDepartment = async (deptId: number, deptName: string) => {
    if (!window.confirm(`Are you sure you want to remove the "${deptName}" department?`)) {
      return;
    }
    try {
      setDeletingDeptId(deptId);
      setDeptErrorMsg(null);
      setDeptSuccessMsg(null);
      await api.deleteDepartment(deptId || deptName);
      setDeptSuccessMsg(`Department "${deptName}" removed successfully.`);
      await fetchDepartments();
      if (department === deptName) {
        setDepartment('ALL');
      }
      setTimeout(() => setDeptSuccessMsg(null), 3500);
    } catch (err: any) {
      setDeptErrorMsg(err.message || `Failed to delete department "${deptName}"`);
    } finally {
      setDeletingDeptId(null);
    }
  };

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
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [department]);

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      setCreatingDept(true);
      setDeptErrorMsg(null);
      setDeptSuccessMsg(null);
      await api.createDepartment(newDeptName.trim());
      await fetchDepartments();
      setNewDeptName('');
      setDeptSuccessMsg(`Department "${newDeptName.trim()}" created successfully.`);
      setTimeout(() => setDeptSuccessMsg(null), 3500);
    } catch (err: any) {
      setDeptErrorMsg(err.message || 'Failed to create department');
    } finally {
      setCreatingDept(false);
    }
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditFormData({
      name: emp.name,
      work_email: emp.work_email,
      department: emp.department,
      designation: emp.designation,
      date_of_joining: emp.date_of_joining,
      account_status: emp.account_status,
    });
    setEditErrorMsg(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      setSavingEdit(true);
      setEditErrorMsg(null);
      await api.updateEmployee(editingEmployee.employee_id, editFormData);
      setEditingEmployee(null);
      await fetchEmployees();
    } catch (err: any) {
      setEditErrorMsg(err.message || 'Failed to update employee profile');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopyLink = async (employeeId: string) => {
    try {
      const data = await api.getEmployeePortalLink(employeeId);
      const origin = window.location.origin;
      const url = `${origin}/?token=${data.token_secret}`;
      await navigator.clipboard.writeText(url);
      setCopiedEmpId(employeeId);
      setTimeout(() => setCopiedEmpId(null), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch attendance link');
    }
  };

  const handleLaunchPortal = async (employeeId: string) => {
    try {
      const data = await api.getEmployeePortalLink(employeeId);
      onOpenPortalWithToken(data.token_secret);
    } catch (err: any) {
      alert(err.message || 'Failed to launch portal');
    }
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
        weekly_off_days: 'Sunday',
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

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Department Filter */}
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="glass-input px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departmentsList.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Manage Departments Button */}
          <button
            onClick={() => {
              setShowAddDeptModal(true);
              setDeptErrorMsg(null);
              setDeptSuccessMsg(null);
            }}
            className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/80 hover:bg-slate-100 text-[#16194F] border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5 shrink-0"
            title="Manage departments (Add or Remove)"
          >
            <Building className="w-3.5 h-3.5 text-[#00A3E0]" />
            <span>Departments</span>
          </button>

          {/* View Mode Toggle: Grid vs List */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`cursor-pointer p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-[#16194F] shadow-2xs font-bold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`cursor-pointer p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-[#16194F] shadow-2xs font-bold'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Compact Table / List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

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

      {/* Employee List (Grid vs List View) */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 glass-panel rounded-2xl">
          <div className="animate-spin w-6 h-6 border-2 border-[#00A3E0] border-t-transparent rounded-full mx-auto mb-2"></div>
          Loading employee directory...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="py-12 text-center text-slate-400 italic glass-panel rounded-2xl">
          No employees match your search criteria.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
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
                    <Clock className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span>Shift: 10:00 AM - 7:00 PM (Sunday Off)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Joined: {emp.date_of_joining}</span>
                  </div>
                  {emp.date_of_exit && (
                    <div className="flex items-center gap-2 text-rose-700 font-semibold">
                      <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Exit: {emp.date_of_exit}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Copy attendance portal link */}
                <button
                  onClick={() => handleCopyLink(emp.employee_id)}
                  className={`cursor-pointer px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                    copiedEmpId === emp.employee_id
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-white/80 hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                  title="Copy permanent employee attendance link"
                >
                  {copiedEmpId === emp.employee_id ? (
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
                  {/* Edit Profile */}
                  <button
                    onClick={() => handleOpenEdit(emp)}
                    className="cursor-pointer p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                    title="Edit Employee Profile"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Test portal directly */}
                  <button
                    onClick={() => handleLaunchPortal(emp.employee_id)}
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
          ))}
        </div>
      ) : (
        /* Compact List / Table View */
        <div className="glass-panel rounded-2xl border border-white/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department &amp; Designation</th>
                  <th className="py-3 px-4">Shift &amp; Weekly Off</th>
                  <th className="py-3 px-4">Joining &amp; Exit Dates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-white/60">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#16194F] to-[#1E2568] text-[#F5BE2C] font-bold flex items-center justify-center text-xs shadow-2xs shrink-0">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#16194F]">{emp.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {emp.employee_id} &bull; {emp.work_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{emp.department}</div>
                      <div className="text-[11px] text-slate-500">{emp.designation}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      <div>10:00 AM - 7:00 PM</div>
                      <div className="text-[10px] text-slate-400 font-sans">Sunday Off</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700 font-medium">Joined: {emp.date_of_joining}</div>
                      {emp.date_of_exit && (
                        <div className="text-rose-600 font-semibold text-[11px] flex items-center gap-1 mt-0.5">
                          <LogOut className="w-3 h-3 text-rose-500" />
                          <span>Exit: {emp.date_of_exit}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.account_status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {emp.account_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="cursor-pointer p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Edit Employee Profile"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopyLink(emp.employee_id)}
                          className={`cursor-pointer px-2 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1 transition-all ${
                            copiedEmpId === emp.employee_id
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                          title="Copy Attendance Link"
                        >
                          {copiedEmpId === emp.employee_id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-400" />
                              <span>Link</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleLaunchPortal(emp.employee_id)}
                          className="cursor-pointer p-1.5 rounded-lg text-slate-500 hover:text-[#00A3E0] hover:bg-cyan-50"
                          title="Launch Portal"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRegenerateToken(emp.employee_id)}
                          className="cursor-pointer p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                          title="Regenerate Token"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(emp.employee_id)}
                          className={`cursor-pointer p-1.5 rounded-lg transition-colors ${
                            emp.account_status === 'ACTIVE'
                              ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={emp.account_status === 'ACTIVE' ? 'Deactivate Employee' : 'Activate Employee'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectEmployeeForDashboard(emp.employee_id)}
                          className="cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-2xs transition-colors"
                        >
                          Dashboard
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    {departmentsList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
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

      {/* Manage Departments Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/90 shadow-2xl relative">
            <button
              onClick={() => {
                setShowAddDeptModal(false);
                setDeptErrorMsg(null);
                setDeptSuccessMsg(null);
              }}
              className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#16194F] mb-1 flex items-center gap-2">
              <Building className="w-5 h-5 text-[#00A3E0]" />
              <span>Manage Departments</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add new departments or remove existing ones. Deletion is safely prevented if employees are currently assigned.
            </p>

            {deptErrorMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">{deptErrorMsg}</div>
            )}
            {deptSuccessMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">{deptSuccessMsg}</div>
            )}

            {/* Add Department Form */}
            <form onSubmit={handleCreateDepartment} className="space-y-3 mb-6">
              <label className="text-xs font-semibold text-slate-700 block">Add New Department</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Quality Assurance"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="glass-input flex-1 px-3 py-2 rounded-xl text-xs font-medium"
                />
                <button
                  type="submit"
                  disabled={creatingDept}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-xs shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{creatingDept ? 'Adding...' : 'Add'}</span>
                </button>
              </div>
            </form>

            {/* Existing Departments List with Remove Option */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Existing Departments ({departmentsData.length})
              </label>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {departmentsData.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No departments configured.</p>
                ) : (
                  departmentsData.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/60 transition-colors"
                    >
                      <span className="text-xs font-semibold text-slate-800">{d.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDepartment(d.id, d.name)}
                        disabled={deletingDeptId === d.id}
                        className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title={`Remove ${d.name} department`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddDeptModal(false);
                  setDeptErrorMsg(null);
                  setDeptSuccessMsg(null);
                }}
                className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Profile Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-white/90 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingEmployee(null)}
              className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#16194F] mb-1 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-600" />
              <span>Edit Employee Profile</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update information for {editingEmployee.name} ({editingEmployee.employee_id}).
            </p>

            {editErrorMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">{editErrorMsg}</div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  value={editFormData.work_email}
                  onChange={(e) => setEditFormData({ ...editFormData, work_email: e.target.value })}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Department *</label>
                  <select
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    {departmentsList.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Date of Joining</label>
                  <input
                    type="date"
                    value={editFormData.date_of_joining}
                    onChange={(e) => setEditFormData({ ...editFormData, date_of_joining: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Account Status</label>
                  <select
                    value={editFormData.account_status}
                    onChange={(e) => setEditFormData({ ...editFormData, account_status: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DEACTIVATED">DEACTIVATED</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="cursor-pointer px-5 py-2 rounded-xl text-xs font-bold bg-[#16194F] hover:bg-[#1E2568] text-white shadow-xs"
                >
                  {savingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
