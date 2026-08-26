import React, { useCallback, useEffect, useState } from 'react';
import DispensingLogs from '../components/DispensingLogs';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const EVENT_TYPES = [
  '',
  'LOGIN',
  'LOGOUT',
  'BRANCH_SWITCHED',
  'SALE_MADE',
  'PRODUCT_CREATED',
  'PRODUCT_EDITED',
  'PRODUCT_DELETED',
  'PRODUCT_RESTOCKED',
  'TRANSFER_REQUESTED',
  'TRANSFER_APPROVED',
  'USER_CREATED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
  'PASSWORD_RESET',
  'PERMISSION_CHANGED',
  'STOCK_EXPIRED',
];

const UserActivityLogs = () => {
  const { allowedBranches } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [branchId, setBranchId] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page_size: 200 };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (eventType) params.event_type = eventType;
      if (branchId) params.branch_id = branchId;
      const res = await api.get('/auth/activity-logs/', {
        params,
        skipGlobalErrorNotification: true,
      });
      const payload = res.data?.data ?? res.data;
      const results = Array.isArray(payload) ? payload : (payload?.results || []);
      setLogs(results);
    } catch (err) {
      setError('User activity logs are not available for this account.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, eventType, branchId]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDetails = (log) => {
    if (!log.details || typeof log.details !== 'object' || Object.keys(log.details).length === 0) {
      return '—';
    }
    const d = log.details;
    switch (log.event_type || log.action_type) {
      case 'SALE_MADE':
        return `Receipt #${d.dispensation_id || '?'} — KES ${Number(d.total_amount || 0).toLocaleString()}`;
      case 'USER_CREATED':
        return `Created user: ${d.created_user || '—'} (${d.role || '—'})`;
      case 'USER_DEACTIVATED':
      case 'USER_REACTIVATED':
      case 'PASSWORD_RESET':
        return `Target user: ${d.target_user || '—'}`;
      case 'PERMISSION_CHANGED':
        return `Updated permissions for ${d.target_user || '—'}`;
      case 'PRODUCT_CREATED':
        return `Added product: ${d.product_name || d.product_id || '—'}`;
      case 'PRODUCT_EDITED':
        return `Edited product: ${d.product_name || d.product_id || '—'}`;
      case 'PRODUCT_DELETED':
        return `Deleted product: ${d.product_name || d.product_id || '—'}`;
      case 'PRODUCT_RESTOCKED':
        return `Restocked ${d.product_name || 'item'} (${d.quantity_received ?? '?'} units from ${d.supplier || '—'})`;
      case 'BRANCH_SWITCHED':
        return d.action || `Switched to ${d.branch_name || d.to_branch || 'branch'}`;
      case 'TRANSFER_REQUESTED':
        return `Transfer requested: ${d.product_name || d.product_id || 'item'} × ${d.quantity ?? '?'}`;
      case 'TRANSFER_APPROVED':
        return `Transfer approved: ${d.product_name || d.product_id || 'item'} × ${d.quantity ?? '?'}`;
      case 'STOCK_EXPIRED':
        return `Expired: ${d.product_name || d.product_id || 'item'} (${d.quantity ?? '?'} units)`;
      case 'LOGIN':
        return d.branch_name
          ? `Signed in at ${d.branch_name}`
          : (d.action || 'Signed in');
      default: {
        try {
          return JSON.stringify(d);
        } catch {
          return '—';
        }
      }
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setEventType('');
    setBranchId('');
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-bold text-slate-800">User Activity Logs</h2>
          <button
            type="button"
            onClick={load}
            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            From
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 font-medium"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            To
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 font-medium"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            Action
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 font-medium min-w-[10rem]"
            >
              <option value="">All actions</option>
              {EVENT_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
          {(allowedBranches?.length || 0) > 1 && (
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
              Branch
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 font-medium min-w-[10rem]"
              >
                <option value="">All branches</option>
                {allowedBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          )}
          {(startDate || endDate || eventType || branchId) && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              {['User', 'Action', 'Details', 'Branch', 'IP Address', 'Timestamp'].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="py-12 text-center text-rose-500">{error}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-slate-400">No activity logs found for this range.</td></tr>
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
    <div className="space-y-6">
      <div className="flex gap-2 p-1.5 rounded-2xl border w-fit" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
        <button
          onClick={() => setActiveTab('dispensing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'dispensing' ? 'bg-white text-primary shadow' : 'text-slate-500'}`}
        >
          Dispensing Logs
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'activity' ? 'bg-white text-primary shadow' : 'text-slate-500'}`}
        >
          User Activity Logs
        </button>
      </div>

      {activeTab === 'dispensing' ? <DispensingLogs /> : <UserActivityLogs />}
    </div>
  );
};

export default DispensingLogsPage;
