import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, Terminal, Search, AlertCircle } from 'lucide-react';
import { ActivityLog, AppSettings } from '../types';
import { formatTimestampInTimezone } from '../utils';

interface AuditViewProps {
  logs: ActivityLog[];
  onClearLogs?: () => void;
  appSettings?: AppSettings;
}

export default function AuditView({ logs, onClearLogs, appSettings }: AuditViewProps) {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterAction]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.ipAddress.includes(search);

    const matchesAction = filterAction === 'ALL' || log.action === filterAction;

    return matchesSearch && matchesAction;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = React.useMemo(() => {
    return filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const actionsList = Array.from(new Set(logs.map(l => l.action)));

  return (
    <div className="space-y-6 flex flex-col min-h-0">
      
      {/* Search and Filters Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="relative">
          <label htmlFor="audit-search-field" className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Search Logs</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input 
              id="audit-search-field"
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, action details, IP..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-slate-300 focus:bg-white focus:outline-hidden rounded-xl text-xs transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="action-filter" className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider">Action Type</label>
          <select 
            id="action-filter"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 focus:border-slate-300 focus:bg-white focus:outline-hidden rounded-xl text-xs text-slate-600 transition-all cursor-pointer"
          >
            <option value="ALL">All Actions</option>
            {actionsList.map((act, idx) => (
              <option key={idx} value={act}>{act}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end justify-end">
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <ShieldAlert className="w-4 h-4 text-slate-500" />
            Integrity Check: ACTIVE
          </div>
        </div>
      </div>

      {/* Audit Log list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-500" />
              Automated Audit Trail
            </h3>
            <p className="text-[10px] text-slate-400">Tamper-evident logs of ledger users and connections</p>
          </div>
        </div>

        {/* List Table */}
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse text-xs relative">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-xs z-10 border-b border-slate-100">
              <tr className="text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">User</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Action</th>
                <th className="py-3.5 px-6">Incident Details</th>
                <th className="py-3.5 px-6 font-mono text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No audit records located matching parameters.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log, idx) => {
                  let badgeColor = 'bg-slate-50 border-slate-200 text-slate-600';
                  if (log.action.includes('FAIL') || log.action.includes('REJECT')) {
                    badgeColor = 'bg-red-50 border-red-200 text-red-600';
                  } else if (log.action.includes('REPLENISH') || log.action.includes('APPROVE')) {
                    badgeColor = 'bg-emerald-50 border-emerald-200 text-emerald-600';
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 text-slate-400 font-mono text-[10px]">{formatTimestampInTimezone(log.timestamp, appSettings?.timezone, appSettings?.dateFormat)}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">{log.user}</td>
                      <td className="py-4 px-6">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 border border-slate-200 text-slate-500">
                          {log.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold font-mono border ${badgeColor}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 max-w-md break-words">{log.details}</td>
                      <td className="py-4 px-6 text-right font-mono text-slate-400 text-[10px]">{log.ipAddress}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50 shrink-0 select-none bg-slate-50/10 print:hidden">
            <div className="text-[11px] text-slate-500">
              Showing <span className="font-bold text-slate-800">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredLogs.length)}</span> to <span className="font-bold text-slate-800">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="font-bold text-slate-800">{filteredLogs.length}</span> entries
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-all shadow-2xs ${currentPage === 1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer'}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition-all shadow-2xs ${currentPage === totalPages ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
