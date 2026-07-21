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
  BanknotesIcon,
  ChartBarIcon,
  CheckCircleIcon,
  InboxStackIcon,
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
import StatCard from '../components/ui/StatCard';
import StatusDot from '../components/ui/StatusDot';
import EmptyState from '../components/ui/EmptyState';
import { StatGridSkeleton, PanelSkeleton } from '../components/ui/Skeleton';
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        <div className="mb-8">
          <WelcomeBanner />
        </div>
        <div className="h-5 w-40 animate-shimmer rounded-lg mb-4" />
        <StatGridSkeleton count={3} withTrend />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <PanelSkeleton rows={4} />
          <PanelSkeleton rows={4} />
          <PanelSkeleton rows={4} />
        </div>
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
  // Per-branch revenue makes a lightweight distribution sparkline on the revenue card.
  const revenueTrend = branches.map((b) => Number(b.today_revenue) || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in font-sans">
      <div className="dash-hero mb-8">
        <WelcomeBanner />
      </div>

      {/* SECTION A — Global Overview */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2.5" style={{ color: 'var(--text-primary)' }}>
            Global Overview
            <StatusDot tone="operational" label="Operational" title="System is operational" />
            <RefreshIndicator isFetching={isRefreshing} isLoading={loadingGlobal} />
          </h2>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>All branches</span>
        </div>

        {globalData?.active_users?.length > 0 && (
          <div className="mb-6 glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <StatusDot tone="operational" />
              Currently Logged-in Users
            </h3>
            <div className="flex flex-wrap gap-3">
              {globalData.active_users.map(u => (
                <div
                  key={u.id}
                  className="flex flex-col rounded-xl p-2 px-3 border"
                  style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}
                >
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{u.username}</span>
                  <span className="text-[10px] uppercase" style={{ color: 'var(--text-secondary)' }}>{u.role} {u.branch ? `• ${u.branch}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Total revenue today"
            value={Number(totals.total_revenue_today) || 0}
            format={formatMoney}
            icon={BanknotesIcon}
            accent="emerald"
            trend={revenueTrend}
            delayIndex={1}
          />
          <StatCard
            label="Total sales today"
            value={Number(totals.total_sales_today) || 0}
            icon={ChartBarIcon}
            accent="indigo"
            delayIndex={2}
          />
          <StatCard
            label="Low stock (all branches)"
            value={Number(totals.total_low_stock) || 0}
            icon={ExclamationTriangleIcon}
            accent="rose"
            hint="Across every branch"
            delayIndex={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch, i) => {
            const products = Number(branch.products_count) || 0;
            const lowStock = Number(branch.low_stock_count) || 0;
            // Stock-health bar: proportion of catalogue that is NOT low on stock.
            const healthPct = products > 0
              ? Math.max(0, Math.min(100, Math.round(((products - lowStock) / products) * 100)))
              : 100;
            const healthColor = healthPct >= 85 ? '#10b981' : healthPct >= 60 ? '#f59e0b' : '#f43f5e';
            return (
              <div
                key={branch.id}
                className={`glass-card rounded-2xl p-5 card-enter card-enter-${Math.min(6, i + 1)}`}
              >
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{branch.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{formatBranchType(branch.type, branch.name)}</p>
                  </div>
                  <span
                    className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--brand-mist)' }}
                  >
                    <BuildingOffice2Icon className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs" style={{ color: 'var(--text-secondary)' }}>Products</dt>
                    <dd className="font-bold" style={{ color: 'var(--text-primary)' }}>{products}</dd>
                  </div>
                  <div>
                    <dt className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sales today</dt>
                    <dd className="font-bold" style={{ color: 'var(--text-primary)' }}>{branch.today_sales_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs" style={{ color: 'var(--text-secondary)' }}>Revenue today</dt>
                    <dd className="font-bold text-emerald-500">{formatMoney(branch.today_revenue)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs" style={{ color: 'var(--text-secondary)' }}>Low stock</dt>
                    <dd className="font-bold text-rose-500">{lowStock}</dd>
                  </div>
                </dl>
                {/* Stock health bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Stock health</span>
                    <span className="text-[10px] font-bold" style={{ color: healthColor }}>{healthPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-field)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${healthPct}%`, background: healthColor }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION B — Active Branch Operations */}
      <section>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
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
          <EmptyState
            icon={BuildingOffice2Icon}
            title="No active branch selected"
            message="Choose a branch to see alerts, transactions, and transfers."
            action={(
              <Link to="/branch/select" className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white">
                Select a branch →
              </Link>
            )}
          />
        )}

        {activeBranch?.id && branchError && !branchOps && (
          <EmptyState
            icon={ExclamationTriangleIcon}
            title="Failed to load branch operations"
            message="Something went wrong fetching this branch's data."
            action={(
              <button type="button" className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white" onClick={() => void refetchBranch()}>
                Retry
              </button>
            )}
          />
        )}

        {activeBranch?.id && loadingOps && !branchOps && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PanelSkeleton rows={4} />
            <PanelSkeleton rows={4} />
            <PanelSkeleton rows={3} className="lg:col-span-2" />
          </div>
        )}

        {activeBranch?.id && branchOps && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.16)' }}>
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                </span>
                Low stock ({loadingLowStock ? '…' : lowStockAlerts.length})
              </h3>
              {loadingLowStock ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="h-4 flex-1 animate-shimmer rounded" style={{ maxWidth: `${70 - i * 8}%` }} />
                      <div className="h-4 w-14 animate-shimmer rounded" />
                    </div>
                  ))}
                </div>
              ) : lowStockAlerts.length ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {lowStockAlerts.map((item) => (
                    <li key={item.product_id ?? item.id} className="flex justify-between text-sm py-2 border-b last:border-0" style={{ borderColor: 'var(--border-primary)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.product_name ?? item.name}</span>
                      <span className="text-rose-500 font-bold">{item.quantity ?? item.stock_quantity} left</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact tone="positive" icon={CheckCircleIcon} title="Stock levels healthy" message="No low-stock alerts for this branch." />
              )}
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244, 63, 94, 0.14)' }}>
                  <ClockIcon className="w-5 h-5 text-rose-500" />
                </span>
                Expiry alerts ({loadingExpiry ? '…' : expiryCount})
              </h3>
              {loadingExpiry ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="h-4 flex-1 animate-shimmer rounded" style={{ maxWidth: `${68 - i * 8}%` }} />
                      <div className="h-4 w-12 animate-shimmer rounded" />
                    </div>
                  ))}
                </div>
              ) : expiryAlertItems.length ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {expiryAlertItems.map((item) => (
                    <li key={item.id} className="flex justify-between text-sm py-2 border-b last:border-0" style={{ borderColor: 'var(--border-primary)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.product_name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.days_left}d left</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact tone="positive" icon={CheckCircleIcon} title="Nothing expiring soon" message="No products expiring within 60 days." />
              )}
            </div>

            <div className="glass-card rounded-2xl p-6 lg:col-span-2">
              <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.14)' }}>
                  <ShoppingBagIcon className="w-5 h-5 text-indigo-500" />
                </span>
                Last 5 transactions
              </h3>
              {branchOps.recent_transactions?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' }}>
                        <th className="pb-2 pr-4">Type</th>
                        <th className="pb-2 pr-4">Amount</th>
                        <th className="pb-2 pr-4">Payment</th>
                        <th className="pb-2 pr-4">By</th>
                        <th className="pb-2">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchOps.recent_transactions.map((tx) => (
                        <tr key={tx.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-primary)' }}>
                          <td className="py-2 pr-4 capitalize" style={{ color: 'var(--text-primary)' }}>{tx.sale_type}</td>
                          <td className="py-2 pr-4 font-bold text-emerald-500">{formatMoney(tx.total_amount)}</td>
                          <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{tx.payment_mode}</td>
                          <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{tx.dispensed_by}</td>
                          <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{new Date(tx.dispensed_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState compact icon={ShoppingBagIcon} title="No recent transactions" message="Sales at this branch will show up here." />
              )}
            </div>

            <div className="glass-card rounded-2xl p-6 lg:col-span-2">
              <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.14)' }}>
                  <TruckIcon className="w-5 h-5 text-blue-500" />
                </span>
                Pending stock transfers ({branchOps.pending_transfers_count})
              </h3>
              {branchOps.pending_transfers?.length ? (
                <ul className="space-y-3">
                  {branchOps.pending_transfers.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap justify-between gap-2 p-3 rounded-xl text-sm items-center border"
                      style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}
                    >
                      <div>
                        <span className="font-medium block" style={{ color: 'var(--text-primary)' }}>{t.product_name} × {t.quantity}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {t.source_branch} → {t.destination_branch} · {t.requested_by} · {new Date(t.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="text-xs font-bold text-emerald-600 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.14)' }} onClick={() => setApproveModal(t)}>Approve</button>
                        <button type="button" className="text-xs font-bold text-rose-600 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(244, 63, 94, 0.14)' }} onClick={() => setRejectModal(t.id)}>Reject</button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact tone="positive" icon={InboxStackIcon} title="No pending transfers" message="Transfer requests awaiting approval will appear here." />
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
