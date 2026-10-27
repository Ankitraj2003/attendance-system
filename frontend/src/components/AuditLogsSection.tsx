import React, { useState, useEffect } from 'react';
import { ShieldCheck, History, User, Calendar, FileText } from 'lucide-react';
import { api } from '../api';
import { AuditLog } from '../types';

export const AuditLogsSection: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getAuditLogs(100)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatIST = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 border border-white/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#16194F] text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#16194F] tracking-tight">System Audit & Change Trail</h2>
            <p className="text-xs text-slate-500">
              Immutable logging of administrative corrections, leave approvals, and employee modifications
            </p>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl border border-white/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="animate-spin w-6 h-6 border-2 border-[#00A3E0] border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/60">
                    <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                      {formatIST(log.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#16194F]">{log.actor}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{log.actor_role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{log.entity_type}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{log.entity_id}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate" title={log.reason || ''}>
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
