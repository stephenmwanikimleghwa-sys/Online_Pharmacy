import React, { useEffect, useState } from 'react';
import DispensingLogs from '../components/DispensingLogs';
import api from '../services/api';

const UserActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get('/auth/activity-logs/', {
          params: { page_size: 100 },
          skipGlobalErrorNotification: true,
        });
        const payload = res.data?.data ?? res.data;
        const results = Array.isArray(payload) ? payload : (payload?.results || []);
        setLogs(results);
      } catch (err) {
        setError('User activity logs are not available for this account.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDetails = (log) => {
    if (!log.details || Object.keys(log.details).length === 0) return '—';
    const d = log.details;
    switch (log.event_type || log.action_type) {
      case 'SALE_MADE':
        return `Receipt #${d.dispensation_id || '?'} — KES ${Number(d.total_amount || 0).toLocaleString()}`;
      case 'USER_CREATED':
        return `Created user: ${d.created_user} (${d.role})`;
      case 'USER_DEACTIVATED':
      case 'USER_REACTIVATED':
      case 'PASSWORD_RESET':
        return `Target user: ${d.target_user}`;
      case 'PERMISSION_CHANGED':
        return `Updated permissions for ${d.target_user}`;
      case 'PRODUCT_CREATED':
        return `Added product: ${d.product_name || d.product_id}`;
      case 'PRODUCT_EDITED':
        return `Edited product: ${d.product_name || d.product_id}`;
      case 'PRODUCT_DELETED':
        return `Deleted product: ${d.product_name || d.product_id}`;
      case 'PRODUCT_RESTOCKED':
        return `Restocked ${d.product_name} (${d.quantity_received} units from ${d.supplier})`;
      case 'BRANCH_SWITCHED':
        return d.action || 'Switched branch';
      default:
        return JSON.stringify(d);
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="font-display font-bold text-slate-800">User Activity Logs</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              {['User', 'Action', 'Details', 'Branch', 'IP Address', 'Timestamp'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="py-12 text-center text-rose-500">{error}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400">No activity logs found.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-slate-800">{log.username || log.user || '—'}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-indigo-600">{log.action_type || log.event_type || '—'}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{formatDetails(log)}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{log.branch_name || log.branch || '—'}</td>
                  <td className="px-5 py-3 text-sm text-slate-600">{log.ip_address || '—'}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DispensingLogsPage = () => {
  const [activeTab, setActiveTab] = useState('dispensing');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex gap-2 p-1.5 rounded-2xl border w-fit" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
        <button
          onClick={() => setActiveTab('dispensing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${activeTab === 'dispensing' ? 'bg-white text-primary shadow' : 'text-slate-500'}`}
        >
          Dispensing Logs
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${activeTab === 'activity' ? 'bg-white text-primary shadow' : 'text-slate-500'}`}
        >
          User Activity Logs
        </button>
      </div>

      {activeTab === 'dispensing' ? <DispensingLogs /> : <UserActivityLogs />}
    </div>
  );
};

export default DispensingLogsPage;