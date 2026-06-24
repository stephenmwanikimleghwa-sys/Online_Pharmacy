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

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="modal-card w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up">
        {/* Header Section */}
        <div className="px-10 py-8 flex justify-between items-center border-b" style={{borderColor:'var(--border-primary)', background:'var(--bg-field)'}}>
          <div>
            <h2 className="text-3xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>Stock history: <span className="text-primary">{item.name}</span></h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1" style={{color:'var(--text-secondary)'}}>See when stock went up or down</p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-90 form-cancel-btn"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10" style={{background:'var(--bg-primary)'}}>
          {loading ? (
            <div className="flex flex-col justify-center items-center h-64 gap-4 opacity-40">
              <div className="animate-spin rounded-xl h-12 w-12 border-[3px] border-t-transparent" style={{borderColor:'var(--color-primary)', borderTopColor:'transparent'}}></div>
              <p className="text-xs font-bold uppercase tracking-widest animate-pulse" style={{color:'var(--text-secondary)'}}>Loading...</p>
            </div>
          ) : error ? (
            <div className="alert-error rounded-3xl p-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{background:'rgba(220,38,38,0.12)'}}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="font-bold text-lg">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="data-cell rounded-3xl p-20 text-center flex flex-col items-center opacity-60">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner" style={{background:'var(--bg-card)'}}>
                <svg className="w-10 h-10" style={{color:'var(--border-primary)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="font-display font-bold text-xl uppercase tracking-tight" style={{color:'var(--text-primary)'}}>No history yet</p>
              <p className="text-sm mt-1" style={{color:'var(--text-secondary)'}}>No stock changes recorded for this item.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border shadow-sm" style={{borderColor:'var(--border-primary)'}}>
              <table className="min-w-full divide-y" style={{borderColor:'var(--border-primary)'}}>
                <thead className="table-header-row">
                  <tr>
                    {['Date & time', 'Type', 'Change', 'Reason', 'By'].map((h) => (
                      <th key={h} className="px-8 py-5 text-left text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:'var(--text-secondary)'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{background:'var(--bg-card)', borderColor:'var(--border-primary)'}}>
                  {logs.map((log) => (
                    <tr key={log.id} className="transition-colors" style={{}} onMouseEnter={e => e.currentTarget.style.background='var(--bg-field)'} onMouseLeave={e => e.currentTarget.style.background=''}>
                      <td className="px-8 py-6 text-xs font-bold" style={{color:'var(--text-secondary)'}}>
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${log.change_type === 'restock' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            log.change_type === 'sale' ? 'text-primary border' : 'border'
                          }`} style={log.change_type === 'sale' ? {background:'var(--brand-mist)', borderColor:'var(--brand-border-soft)'} : log.change_type !== 'restock' ? {background:'var(--bg-field)', color:'var(--text-secondary)', borderColor:'var(--border-primary)'} : {}}>
                          {log.change_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <span className={`text-xl font-display font-bold ${log.change_amount > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                          </span>
                          <div className="text-[10px] font-bold uppercase tracking-tighter" style={{color:'var(--border-primary)'}}>
                            {log.previous_quantity} → {log.new_quantity}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-medium max-w-xs truncate" style={{color:'var(--text-secondary)'}}>{log.reason || '—'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{background:'var(--brand-mist)', color:'var(--text-secondary)'}}>
                            {log.logged_by_username?.[0]?.toUpperCase() || 'S'}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight" style={{color:'var(--text-primary)'}}>{log.logged_by_username || 'System'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-10 py-6 border-t flex justify-end" style={{borderColor:'var(--border-primary)', background:'var(--bg-field)'}}>
          <button
            onClick={onClose}
            className="btn-primary px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-premium hover:shadow-glow active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockLogsModal;
