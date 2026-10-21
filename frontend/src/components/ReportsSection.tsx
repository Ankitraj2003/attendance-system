import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  Calendar,
  Building,
  CheckCircle2,
  ShieldCheck,
  Download,
  Layers,
  Info
} from 'lucide-react';
import { api } from '../api';

export const ReportsSection: React.FC = () => {
  const [department, setDepartment] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().setDate(1)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleDownloadExcel = () => {
    const url = api.getCompanyExcelUrl(startDate, endDate, department);
    window.open(url, '_blank');
  };

  const handleDownloadCsv = () => {
    const url = api.getCompanyCsvUrl(startDate, endDate, department);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-[#16194F] text-[#F5BE2C]">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#16194F] tracking-tight">
              Enterprise Reports & Data Export Center
            </h2>
            <p className="text-xs text-slate-500">
              Generate audited multi-sheet Excel workbooks and RFC-4180 CSV exports with formula injection safeguards
            </p>
          </div>
        </div>
      </div>

      {/* Export Configuration Card */}
      <div className="glass-card rounded-2xl p-6 border border-white/90 shadow-sm max-w-2xl">
        <h3 className="text-sm font-bold text-[#16194F] mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00A3E0]" />
          <span>Export Scope & Filter Settings</span>
        </h3>

        <div className="space-y-4 text-xs">
          {/* Department Selection */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Target Department</span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="glass-input w-full px-3 py-2 rounded-xl font-medium text-slate-800 cursor-pointer"
            >
              <option value="ALL">Company-Wide (All Departments)</option>
              <option value="Engineering">Engineering</option>
              <option value="Product & Design">Product & Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Human Resources">Human Resources</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>End Date</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Excel Workbook Specification Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-slate-600 space-y-2">
            <span className="font-bold text-[#16194F] block flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#00A3E0]" />
              <span>Included Worksheets in Company Excel (.xlsx):</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
              <span className="p-1.5 bg-white rounded border border-slate-200">1. Attendance Records</span>
              <span className="p-1.5 bg-white rounded border border-slate-200">2. Employee Directory</span>
              <span className="p-1.5 bg-white rounded border border-slate-200">3. Leave Requests</span>
              <span className="p-1.5 bg-white rounded border border-slate-200">4. Working Hours</span>
              <span className="p-1.5 bg-white rounded border border-slate-200">5. Attendance Summary</span>
              <span className="p-1.5 bg-white rounded border border-slate-200">6. Exceptions</span>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              All cell text is checked and sanitized against spreadsheet formula injection vulnerabilities.
            </span>
          </div>

          {/* Action Download Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <button
              onClick={handleDownloadExcel}
              className="cursor-pointer flex-1 py-3 px-5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel Workbook (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="cursor-pointer py-3 px-5 rounded-xl font-bold text-xs bg-[#16194F] hover:bg-[#1E2568] text-white shadow-md shadow-indigo-950/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <FileDown className="w-4 h-4 text-[#F5BE2C]" />
              <span>Download CSV File (.csv)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
