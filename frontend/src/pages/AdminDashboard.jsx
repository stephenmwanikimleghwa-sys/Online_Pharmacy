import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { approveTransfer, rejectTransfer } from '../services/procurementService';
import {
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  TruckIcon,
  ClockIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import WelcomeBanner from '../components/WelcomeBanner';
import NewStockIntake from '../components/NewStockIntake';
import ExpiryAlertsWidget from '../components/ExpiryAlertsWidget';
import { useNotification } from '../context/NotificationContext';
import { useDashboardGlobal, useDashboardBranch } from '../hooks/useDashboard';
import { useLowStockAlerts } from '../hooks/useProducts';
import { useExpiryAlerts } from '../hooks/useExpiryAlerts';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import RefreshIndicator from '../components/ui/RefreshIndicator';
import { queryClient } from '../lib/queryClient';
import { unwrapList } from '../utils/parseApiData';

const formatMoney = (n) => `KSh ${Number(n || 0).toLocaleString()}`;
const formatBranchType = (type, name) => {
  if ((name || '').toUpperCase().includes('PEAKFARM')) return 'Agrovet';
  if (!type || type === 'CHEMIST') return 'Chemist';
  if (type === 'AGROVET') return 'Agrovet';
  return type;
};

const invalidateDashboard = () => {
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  void queryClient.invalidateQueries({ queryKey: ['stock', 'alerts'] });
  void queryClient.invalidateQueries({ queryKey: ['expiry'] });
};

const AdminDashboard = () => {
  const { user, activeBranch, requiresBranchSelection, allowedBranches } = useAuth();
  const navigate = useNavigate();
  const [showStockIntake, setShowStockIntake] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const { notify } = useNotification();

  useDocumentTitle('Admin Dashboard');

  const {
    data: globalData,
    isLoading: loadingGlobal,
    isFetching: fetchingGlobal,
    error: globalError,
    refetch: refetchGlobal,
  } = useDashboardGlobal();

  const {
    data: branchOps,
    isLoading: loadingOps,
    isFetching: fetchingOps,
    error: branchError,
    refetch: refetchBranch,
  } = useDashboardBranch(activeBranch?.id);

  const {
    data: lowStockData,
    isLoading: loadingLowStock,
    isFetching: fetchingLowStock,
  } = useLowStockAlerts(activeBranch?.id);

  const {
    data: expiryData,
    isLoading: loadingExpiry,
    isFetching: fetchingExpiry,
  } = useExpiryAlerts(activeBranch?.id);

  const lowStockAlerts = unwrapList(lowStockData);
  const expirySummary = expiryData?.summary || {};
  const expiryAlertItems = [
    ...(expiryData?.critical || []),
    ...(expiryData?.warning || []),
  ];
  const expiryCount =
    (expirySummary.expired ?? 0) +
    (expirySummary.critical ?? 0) +
    (expirySummary.warning ?? 0);

  const isRefreshing =
    (fetchingGlobal && !loadingGlobal) ||
    (fetchingOps && !loadingOps) ||
    (fetchingLowStock && !loadingLowStock) ||
    (fetchingExpiry && !loadingExpiry);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login', { replace: true });
      return;
    }
    if (requiresBranchSelection || (!activeBranch?.id && allowedBranches.length > 1)) {
      navigate('/branch/select', { replace: true });
    }
  }, [user, requiresBranchSelection, activeBranch, allowedBranches.length, navigate]);

  const handleApproveTransfer = async (id) => {
    try {
      await approveTransfer(id);
      setApproveModal(null);
      notify.success('Approved', 'Transfer approved. Stock levels updated.');
      invalidateDashboard();
    } catch {
      notify.error('Failed', 'Could not approve transfer.');
    }
  };

  const handleRejectTransfer = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    try {
      await rejectTransfer(rejectModal, rejectReason);
      notify.success('Rejected', 'Transfer request rejected.');
      setRejectModal(null);
      setRejectReason('');
      invalidateDashboard();
    } catch {
      notify.error('Failed', 'Could not reject transfer.');
    }
  };

  if (loadingGlobal && !globalData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-t-transparent rounded-xl animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (globalError && !globalData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-medium text-red-600">Failed to load global overview.</p>
        <button type="button" className="btn-primary px-4 py-2 rounded-xl text-sm" onClick={() => void refetchGlobal()}>
          Retry
        </button>
      </div>
    );
  }

  const branches = globalData?.branches || [];
  const totals = globalData?.totals || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in font-sans">
      <div className="mb-8">
        <WelcomeBanner />
      </div>

      {/* SECTION A — Global Overview */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Global Overview
            <span title="System is Operational" className="text-emerald-500 animate-[spin_4s_linear_infinite] flex items-center">
              ⚙️
            </span>
            <RefreshIndicator isFetching={isRefreshing} isLoading={loadingGlobal} />
          </h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">All branches</span>
        </div>

        {globalData?.active_users?.length > 0 && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Currently Logged-in Users</h3>
            <div className="flex flex-wrap gap-3">
              {globalData.active_users.map(u => (
                <div key={u.id} className="flex flex-col bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 px-3 border border-gray-100 dark:border-gray-600">
                  <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{u.username}</span>
                  <span className="text-[10px] text-gray-500 uppercase">{u.role} {u.branch ? `• ${u.branch}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total revenue today</p>
            <p className="text-2xl font-bold text-emerald-600">{formatMoney(totals.total_revenue_today)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-rose-100 dark:border-rose-900 shadow-sm bg-rose-50/30">
            <p className="text-xs font-bold text-rose-600 uppercase mb-1">Discounts given today</p>
            <p className="text-2xl font-bold text-rose-700">{formatMoney(totals.total_discounts_today || 0)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total sales today</p>
            <p className="text-2xl font-bold text-indigo-600">{totals.total_sales_today ?? 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Low stock (all branches)</p>
            <p className="text-2xl font-bold text-amber-500">{totals.total_low_stock ?? 0}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{branch.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{formatBranchType(branch.type, branch.name)}</p>
                </div>
                <BuildingOffice2Icon className="w-8 h-8 text-indigo-400 opacity-60 shrink-0" />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500 text-xs">Products</dt>
                  <dd className="font-bold text-gray-900 dark:text-white">{branch.products_count}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Sales today</dt>
                  <dd className="font-bold text-gray-900 dark:text-white">{branch.today_sales_count}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Revenue today</dt>
                  <dd className="font-bold text-emerald-600">{formatMoney(branch.today_revenue)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 text-xs">Low stock</dt>
                  <dd className="font-bold text-rose-600">{branch.low_stock_count}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION B — Active Branch Operations */}
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Active Branch Operations
          </h2>
          {activeBranch ? (
            <>
              <span
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                title="Layer 2 is scoped to this branch. Layer 1 above shows all branches."
              >
                {activeBranch.name}
              </span>
              <Link
                to="/branch/select"
                className="text-sm font-bold text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline"
              >
                Switch Branch
              </Link>
            </>
          ) : (
            <Link
              to="/branch/select"
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
            >
              Select a branch to view operations →
            </Link>
          )}
        </div>

        {activeBranch?.id && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OTC Sale */}
            <div className="btn-primary rounded-2xl p-5 text-white flex flex-col justify-between gap-4">
              <div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <ShoppingBagIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg">Direct OTC Sale</h3>
                <p className="text-sm text-white/90 mt-1">
                  Sell at <strong>{activeBranch.name}</strong>. Stock checks are branch-scoped.
                </p>
              </div>
              <Link
                to="/otc-sales"
                className="px-5 py-2.5 rounded-xl bg-white font-semibold self-start text-sm"
                style={{ color: 'var(--color-primary)' }}
              >
                Open OTC Sale →
              </Link>
            </div>

            {/* New Stock Intake */}
            <div className="rounded-2xl p-5 text-white flex flex-col justify-between gap-4"
              style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)' }}>
              <div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                  <TruckIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-lg">New Stock Intake</h3>
                <p className="text-sm text-white/90 mt-1">
                  Receive stock at <strong>{activeBranch.name}</strong>. Updates branch stock instantly.
                </p>
              </div>
              <button
                onClick={() => setShowStockIntake(true)}
                className="px-5 py-2.5 rounded-xl bg-white font-semibold self-start text-sm text-teal-700"
              >
                New Stock Intake →
              </button>
            </div>
          </div>
        )}

        {/* Stock Intake Modal */}
        {showStockIntake && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 pb-10"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between px-8 py-6 border-b sticky top-0 z-10"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>New Stock Intake</h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Receiving stock at {activeBranch?.name}</p>
                </div>
                <button onClick={() => setShowStockIntake(false)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
                  style={{ color: 'var(--text-secondary)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-8">
                <NewStockIntake
                  onClose={() => setShowStockIntake(false)}
                  onSuccess={() => invalidateDashboard()}
                />
              </div>
            </div>
          </div>
        )}

        {!activeBranch?.id && (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center text-gray-500">
            <p className="font-medium">No active branch selected.</p>
            <p className="text-sm mt-2">Choose a branch to see alerts, transactions, and transfers.</p>
          </div>
        )}

        {activeBranch?.id && branchError && !branchOps && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-700 mb-3">Failed to load branch operations.</p>
            <button type="button" className="btn-primary px-4 py-2 rounded-xl text-sm" onClick={() => void refetchBranch()}>
              Retry
            </button>
          </div>
        )}

        {activeBranch?.id && loadingOps && !branchOps && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-[3px] border-t-transparent rounded-xl animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {activeBranch?.id && branchOps && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                Low stock ({loadingLowStock ? '…' : lowStockAlerts.length})
              </h3>
              {loadingLowStock ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                </div>
              ) : lowStockAlerts.length ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {lowStockAlerts.map((item) => (
                    <li key={item.product_id ?? item.id} className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{item.product_name ?? item.name}</span>
                      <span className="text-rose-600 font-bold">{item.quantity ?? item.stock_quantity} left</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No low stock alerts.</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-rose-500" />
                Expiry alerts ({loadingExpiry ? '…' : expiryCount})
              </h3>
              {loadingExpiry ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                </div>
              ) : expiryAlertItems.length ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {expiryAlertItems.map((item) => (
                    <li key={item.id} className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{item.product_name}</span>
                      <span className="text-gray-500">{item.days_left}d left</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No products expiring within 60 days.</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm lg:col-span-2">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ShoppingBagIcon className="w-5 h-5 text-indigo-500" />
                Last 5 transactions
              </h3>
              {branchOps.recent_transactions?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4">Amount</th>
                        <th className="pb-2 pr-4">Payment</th>
                        <th className="pb-2 pr-4">By</th>
                        <th className="pb-2">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchOps.recent_transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-700/50">
                          <td className="py-2 pr-4 capitalize">{tx.sale_type}</td>
                          <td className="py-2 pr-4 font-bold">{formatMoney(tx.total_amount)}</td>
                          <td className="py-2 pr-4">{tx.payment_mode}</td>
                          <td className="py-2 pr-4">{tx.dispensed_by}</td>
                          <td className="py-2 text-gray-500">{new Date(tx.dispensed_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No recent transactions.</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm lg:col-span-2">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TruckIcon className="w-5 h-5 text-blue-500" />
                Pending stock transfers ({branchOps.pending_transfers_count})
              </h3>
              {branchOps.pending_transfers?.length ? (
                <ul className="space-y-3">
                  {branchOps.pending_transfers.map((t) => (
                    <li key={t.id} className="flex flex-wrap justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 text-sm items-center">
                      <div>
                        <span className="font-medium block">{t.product_name} × {t.quantity}</span>
                        <span className="text-gray-500 text-xs">
                          {t.source_branch} → {t.destination_branch} · {t.requested_by} · {new Date(t.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="text-xs font-bold text-green-700 px-2 py-1 rounded bg-green-50" onClick={() => setApproveModal(t)}>Approve</button>
                        <button type="button" className="text-xs font-bold text-red-700 px-2 py-1 rounded bg-red-50" onClick={() => setRejectModal(t.id)}>Reject</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No pending transfers.</p>
              )}
            </div>
            <ExpiryAlertsWidget />
          </div>
        )}

        {approveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="glass-card rounded-[2rem] p-6 max-w-md w-full border border-white/60 shadow-premium" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Confirm action</p>
                  <h4 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Approve transfer</h4>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Approved</span>
              </div>
              <div className="text-sm space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Product:</span> {approveModal.product_name}</p>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Quantity:</span> {approveModal.quantity}</p>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>From:</span> {approveModal.source_branch}</p>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>To:</span> {approveModal.destination_branch}</p>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Requested by:</span> {approveModal.requested_by}</p>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Requested at:</span> {new Date(approveModal.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2 justify-end mt-5">
                <button type="button" className="btn-secondary px-3 py-2 rounded-xl" onClick={() => setApproveModal(null)}>Cancel</button>
                <button type="button" className="btn-primary px-3 py-2 rounded-xl" onClick={() => handleApproveTransfer(approveModal.id)}>Approve</button>
              </div>
            </div>
          </div>
        )}

        {rejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="glass-card rounded-[2rem] p-6 max-w-md w-full border border-white/60 shadow-premium" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Confirm action</p>
                  <h4 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Reject transfer</h4>
                </div>
                <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Rejected</span>
              </div>
              <textarea className="form-input w-full" rows={3} placeholder="Reason for rejection" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              <div className="flex gap-2 justify-end mt-4">
                <button type="button" className="btn-secondary px-3 py-2 rounded-xl" onClick={() => setRejectModal(null)}>Cancel</button>
                <button type="button" className="btn-primary px-3 py-2 rounded-xl" onClick={handleRejectTransfer}>Reject</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
