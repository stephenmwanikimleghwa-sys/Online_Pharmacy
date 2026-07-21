import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  markBatchRemoved,
  setBatchClearance,
} from '../services/procurementService';
import { ClockIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useExpiryAlerts } from '../hooks/useExpiryAlerts';
import { PanelSkeleton } from './ui/Skeleton';

const EMPTY_EXPIRY = {
  summary: {},
  expired: [],
  critical: [],
  warning: [],
  caution: [],
  caution_count: 0,
};

const ExpiryAlertsWidget = ({ compact = false }) => {
  const { notify } = useNotification();
  const { activeBranch } = useAuth();
  const { data, isLoading, error, refetch } = useExpiryAlerts(activeBranch?.id);
  const [clearanceModal, setClearanceModal] = useState(null);
  const [clearancePrice, setClearancePrice] = useState('');

  const handleRemove = async (batchId) => {
    try {
      await markBatchRemoved(batchId);
      notify.success('Removed', 'Expired stock removed from shelf.');
      void refetch();
    } catch {
      notify.error('Failed', 'Could not mark batch as removed.');
    }
  };

  const handleClearance = async () => {
    if (!clearanceModal || !clearancePrice) return;
    try {
      await setBatchClearance(clearanceModal.id, parseFloat(clearancePrice));
      notify.success('Clearance', 'Batch marked for clearance pricing.');
      setClearanceModal(null);
      setClearancePrice('');
      void refetch();
    } catch {
      notify.error('Failed', 'Could not set clearance price.');
    }
  };

  if (isLoading) return <PanelSkeleton rows={4} />;
  if (error) {
    return (
      <div className="rounded-2xl border border-dashed p-4 text-sm" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>
        <p>Could not load expiry data.</p>
        <button
          type="button"
          className="mt-2 font-semibold hover:underline"
          style={{ color: 'var(--color-primary)' }}
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const displayData = data || EMPTY_EXPIRY;
  const summary = displayData.summary || {};
  const branchLabel = activeBranch?.name || 'your branch';

  return (
    <div className={compact ? 'space-y-3' : 'glass-card rounded-2xl p-6 border'} style={compact ? {} : { borderColor: 'var(--border-primary)' }}>
      <h3 className="font-bold flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
        <ClockIcon className="w-5 h-5 text-rose-500" />
        Expiry Alerts — {branchLabel}
      </h3>
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
        {summary.expired || 0} expired · {summary.critical || 0} critical ·{' '}
        {summary.warning || 0} warning · {summary.caution || 0} caution
      </p>

      {displayData.expired?.length > 0 && (
        <section className="mb-4">
          <h4 className="text-sm font-bold text-red-700 mb-2">EXPIRED</h4>
          <ul className="space-y-2">
            {displayData.expired.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 text-sm border-b pb-2">
                <span>
                  {item.product_name} — expired {Math.abs(item.days_left)}d ago ({item.quantity_remaining} units)
                </span>
                <button type="button" className="text-xs text-red-600 font-semibold" onClick={() => handleRemove(item.id)}>
                  Mark as Removed
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {displayData.critical?.length > 0 && (
        <section className="mb-4">
          <h4 className="text-sm font-bold text-orange-700 mb-2">CRITICAL (≤7 days)</h4>
          <ul className="space-y-2">
            {displayData.critical.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 text-sm border-b pb-2">
                <span>
                  {item.product_name} — expires in {item.days_left}d ({item.quantity_remaining} units)
                </span>
                <div className="flex gap-2">
                  <Link to="/reports" className="text-xs text-indigo-600 font-semibold">View</Link>
                  <button type="button" className="text-xs text-amber-600 font-semibold" onClick={() => setClearanceModal(item)}>
                    Discount & Sell
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {displayData.warning?.length > 0 && (
        <section className="mb-4">
          <h4 className="text-sm font-bold text-yellow-700 mb-2">WARNING (8–30 days)</h4>
          <ul className="space-y-1 text-sm">
            {displayData.warning.slice(0, 5).map((item) => (
              <li key={item.id}>
                {item.product_name} — {item.days_left}d left ({item.quantity_remaining} units)
              </li>
            ))}
          </ul>
        </section>
      )}

      {(displayData.caution_count > 0 || displayData.caution?.length > 0) && (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          CAUTION: {displayData.caution_count || displayData.caution?.length} products within 90 days.{' '}
          <Link to="/reports" className="font-semibold" style={{ color: 'var(--color-primary)' }}>View all</Link>
        </p>
      )}

      {clearanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card rounded-xl p-6 max-w-sm w-full space-y-3 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>Set clearance price</h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{clearanceModal.product_name}</p>
            <input
              type="number"
              className="form-input w-full"
              placeholder="Clearance price (KES)"
              value={clearancePrice}
              onChange={(e) => setClearancePrice(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary px-3 py-1 rounded" onClick={() => setClearanceModal(null)}>Cancel</button>
              <button type="button" className="btn-primary px-3 py-1 rounded" onClick={handleClearance}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpiryAlertsWidget;
