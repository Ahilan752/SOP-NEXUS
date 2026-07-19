import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { useAppStore } from '../context/store';
import { History, ArrowRight, CornerDownRight, Eye } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { showToast } = useAppStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/audit-logs');
      setLogs(res.data);
    } catch (err) {
      showToast('Failed to load audit logs', 'REJECTION');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const renderDiffVal = (val: any) => {
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val);
    }
    return String(val);
  };

  const exportToExcel = () => {
    if (logs.length === 0) {
      showToast('No logs available to export', 'WARNING');
      return;
    }

    const headers = [
      'Log ID',
      'Timestamp',
      'User Name',
      'User Email',
      'Role',
      'Action',
      'Details',
      'IP Address',
      'User Agent'
    ];

    const rows = logs.map(log => [
      log._id || '',
      new Date(log.timestamp).toISOString(),
      log.userName || '',
      log.userEmail || '',
      log.role || '',
      log.action || '',
      log.details || '',
      log.ipAddress || '',
      log.userAgent || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => {
          const stringVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          const cleanVal = stringVal.replace(/"/g, '""');
          return `"${cleanVal}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SOP_Nexus_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Audit logs exported successfully!', 'SUCCESS');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            System Audit Logs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Chronological security audit stream recording all employee and system activities.
          </p>
        </div>
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 w-fit"
        >
          Export Excel
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/20 border border-dashed border-slate-800 rounded-2xl">
          No audit logs recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline Panel */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2">
              System Events Timeline
            </h3>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {logs.map((log) => (
                <div
                  key={log._id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 rounded-xl border text-xs transition-all cursor-pointer flex flex-col gap-2 relative ${
                    selectedLog?._id === log._id
                      ? 'border-primary-500 bg-primary-950/15'
                      : 'border-slate-850 bg-slate-900/30 hover:border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-200">{log.userName}</span>
                    <span className="text-[9px] text-slate-500 font-semibold">
                      {new Date(log.timestamp).getDate()}/{new Date(log.timestamp).getMonth() + 1}/{new Date(log.timestamp).getFullYear()} at{' '}
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                      log.action.includes('CREATE') || log.action === 'LOGIN'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : log.action.includes('DELETE') || log.action.includes('REJECT')
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">
                      {log.role}
                    </span>
                  </div>

                  <p className="text-slate-300 leading-normal font-medium">{log.details}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Changes Inspector */}
          <div className="lg:col-span-1">
            {selectedLog ? (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-5 sticky top-24">
                <div className="border-b border-slate-900 pb-2 flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest">
                    Changes Inspector
                  </h3>
                  <span className="text-[9px] text-slate-500 font-mono">ID: {selectedLog._id.slice(-6)}</span>
                </div>

                {/* Metadata */}
                <div className="text-[11px] space-y-2 border-b border-slate-900 pb-4 text-slate-400">
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Author context</span>
                    {selectedLog.userName} ({selectedLog.userEmail})
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-0.5">Network details</span>
                    IP: {selectedLog.ipAddress} <br />
                    UA: <span className="text-[10px] text-slate-600 block truncate mt-0.5">{selectedLog.userAgent}</span>
                  </div>
                </div>

                {/* Diff Viewer */}
                <div>
                  <span className="text-slate-500 font-bold block uppercase text-[9px] tracking-wider mb-3">
                    State Difference (Git-Style Diff)
                  </span>

                  {selectedLog.diff && (selectedLog.diff.before || selectedLog.diff.after) ? (
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                      {selectedLog.diff.before && (
                        <div className="bg-rose-950/15 border border-rose-500/20 p-3 rounded-lg flex flex-col gap-1 text-[11px]">
                          <span className="text-[9px] text-rose-400 font-bold uppercase mb-1">Before State (-)</span>
                          {Object.keys(selectedLog.diff.before).map((k) => (
                            <div key={k} className="flex gap-2">
                              <span className="text-slate-500 font-bold font-mono">{k}:</span>
                              <span className="text-rose-300 font-mono truncate">{renderDiffVal(selectedLog.diff.before[k])}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedLog.diff.after && (
                        <div className="bg-emerald-950/15 border border-emerald-500/20 p-3 rounded-lg flex flex-col gap-1 text-[11px]">
                          <span className="text-[9px] text-emerald-400 font-bold uppercase mb-1">After State (+)</span>
                          {Object.keys(selectedLog.diff.after).map((k) => (
                            <div key={k} className="flex gap-2">
                              <span className="text-slate-500 font-bold font-mono">{k}:</span>
                              <span className="text-emerald-300 font-mono truncate">{renderDiffVal(selectedLog.diff.after[k])}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic p-4 border border-slate-900 rounded-lg text-center">
                      No structural data changes recorded (e.g. read, view or navigation events).
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-2xl text-slate-500 min-h-[250px] sticky top-24">
                <Eye className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs">Select an event from the timeline to inspect metadata.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
