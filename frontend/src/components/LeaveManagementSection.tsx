import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  FileDown,
  Filter,
  AlertCircle,
  X,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api';
import { LeaveRequest } from '../types';

export const LeaveManagementSection: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusTab, setStatusTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [department, setDepartment] = useState<string>('ALL');
  const [leaveType, setLeaveType] = useState<string>('ALL');
  const [departmentsList, setDepartmentsList] = useState<string[]>([
    'Engineering', 'Product & Design', 'Marketing', 'Human Resources', 'Operations'
  ]);

  // Decision Modal
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [remarks, setRemarks] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.getLeaves({
        status_filter: statusTab === 'PENDING' ? 'PENDING' : undefined,
        department: department !== 'ALL' ? department : undefined,
      });
      setLeaves(res);
    } catch (err) {
      console.error('Failed to load leave requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusTab, department]);

  const handleOpenDecision = (req: LeaveRequest, action: 'APPROVED' | 'REJECTED') => {
    setSelectedRequest(req);
    setDecisionAction(action);
    setRemarks('');
    setErrorMsg(null);
  };

  const handleConfirmDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      await api.processLeaveDecision(selectedRequest.id, {
        status: decisionAction,
        decision_remarks: decisionAction === 'APPROVED' ? remarks : undefined,
        rejection_reason: decisionAction === 'REJECTED' ? remarks : undefined,
      });
      setSelectedRequest(null);
      await fetchLeaves();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process decision');
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = leaves.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/80">
        <div>
          <h2 className="text-lg font-bold text-[#16194F] tracking-tight">Leave Management & Approvals</h2>
          <p className="text-xs text-slate-500">
            Review supporting documents and authorize employee leave requests
          </p>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Download error alert */}
      {downloadError && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{downloadError}</span>
          <button onClick={() => setDownloadError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setStatusTab('PENDING')}
          className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            statusTab === 'PENDING'
              ? 'bg-[#16194F] text-white shadow-xs'
              : 'bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          <span>Pending Approvals</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusTab('ALL')}
          className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            statusTab === 'ALL'
              ? 'bg-[#16194F] text-white shadow-xs'
              : 'bg-white/80 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
          }`}
        >
          All Requests History
        </button>
      </div>

      {/* Leaves Table */}
      <div className="glass-panel rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Leave Type</th>
                <th className="py-3 px-4">Requested Dates</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-6 h-6 border-2 border-[#00A3E0] border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading leave requests...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    {statusTab === 'PENDING'
                      ? 'No pending leave requests awaiting approval.'
                      : 'No leave records found.'}
                  </td>
                </tr>
              ) : (
                leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-white/60">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#16194F]">{l.employee_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{l.employee_id}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{l.department}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-xs text-[#16194F]">{l.leave_type}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {l.start_date} to {l.end_date}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-3 px-4">
                      {l.attachments && l.attachments.length > 0 ? (
                        <a
                          href={api.getAttachmentDownloadUrl(l.attachments[0].id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold hover:bg-amber-100 transition-colors shadow-2xs"
                          title="Open uploaded medical/supporting document in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
                          <span>View Doc</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No document</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : l.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {l.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDecision(l, 'APPROVED')}
                            className="cursor-pointer px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleOpenDecision(l, 'REJECTED')}
                            className="cursor-pointer px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic font-mono">
                          {l.decision_remarks || l.rejection_reason || 'Finalized'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border border-white/90 shadow-2xl relative">
            <button
              onClick={() => setSelectedRequest(null)}
              className="cursor-pointer absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-[#16194F] mb-1 flex items-center gap-2">
              {decisionAction === 'APPROVED' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-500" />
              )}
              <span>{decisionAction === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {selectedRequest.employee_name} &bull; {selectedRequest.leave_type} ({selectedRequest.start_date} to{' '}
              {selectedRequest.end_date})
            </p>

            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs">{errorMsg}</div>
            )}

            <form onSubmit={handleConfirmDecision} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  {decisionAction === 'APPROVED' ? 'Approval Remarks (Optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  required={decisionAction === 'REJECTED'}
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    decisionAction === 'APPROVED'
                      ? 'Add any administrative notes...'
                      : 'State explicit reason for rejection...'
                  }
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs font-medium"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="cursor-pointer px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className={`cursor-pointer px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors ${
                    decisionAction === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {processing ? 'Processing...' : `Confirm ${decisionAction}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
