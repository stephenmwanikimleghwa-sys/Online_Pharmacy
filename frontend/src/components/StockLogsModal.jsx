import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';

const StockLogsModal = ({ item, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStockLogs();
  }, [item]);

  const fetchStockLogs = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getStockLogs(item.id);
      setLogs(response.data || []);
    } catch (err) {
      setError('Failed to fetch stock logs');
      console.error('Error fetching stock logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'restock':
        return 'text-green-600';
      case 'sale':
        return 'text-red-600';
      case 'adjustment':
        return 'text-blue-600';
      case 'expiry':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-premium w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border-[8px] border-white ring-1 ring-slate-200 animate-scale-up">
        {/* Header Section */}
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Stock history: <span className="text-indigo-600">{item.name}</span></h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">See when stock went up or down</p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm active:scale-90"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-white">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64 gap-4 opacity-40">
              <div className="animate-spin rounded-xl h-12 w-12 border-[3px] border-indigo-600 border-t-transparent shadow-glow-indigo"></div>
              <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Loading...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 flex items-center gap-6">
              <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-rose-900 font-bold text-lg">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-slate-50 rounded-3xl p-20 text-center flex flex-col items-center opacity-60">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-slate-800 font-display font-bold text-xl uppercase tracking-tight">No history yet</p>
              <p className="text-slate-400 text-sm mt-1">No stock changes recorded for this item.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    {['Date & time', 'Type', 'Change', 'Reason', 'By'].map((h) => (
                      <th key={h} className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-8 py-6 text-xs font-bold text-slate-500">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${log.change_type === 'restock' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            log.change_type === 'sale' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                          {log.change_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <span className={`text-xl font-display font-bold ${log.change_amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                          </span>
                          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                            {log.previous_quantity} → {log.new_quantity}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs text-slate-600 font-medium max-w-xs truncate">{log.reason || '—'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                            {log.logged_by_username?.[0]?.toUpperCase() || 'S'}
                          </div>
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{log.logged_by_username || 'System'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-10 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 font-bold text-xs uppercase tracking-widest transition-all shadow-premium hover:shadow-glow active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockLogsModal;
