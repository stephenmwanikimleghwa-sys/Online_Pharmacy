import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  TruckIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const formatMoney = (n) => `KSh ${Number(n || 0).toLocaleString()}`;
const formatBranchType = (type) => {
  if (!type || type === 'CHEMIST') return 'Chemist';
  if (type === 'AGROVET') return 'Agrovet';
  return type;
};

const AdminDashboard = () => {
  const { user, activeBranch, requiresBranchSelection } = useAuth();
  const navigate = useNavigate();
  const [globalData, setGlobalData] = useState(null);
  const [branchOps, setBranchOps] = useState(null);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [loadingOps, setLoadingOps] = useState(false);
  const [error, setError] = useState('');

  const fetchGlobal = useCallback(async () => {
    try {
      setLoadingGlobal(true);
      const res = await api.get('/dashboard/global-overview/');
      setGlobalData(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load global overview.');
    } finally {
      setLoadingGlobal(false);
    }
  }, []);

  const fetchBranchOps = useCallback(async () => {
    if (!activeBranch?.id) {
      setBranchOps(null);
      return;
    }
    try {
      setLoadingOps(true);
      const res = await api.get('/dashboard/branch-operations/');
      setBranchOps(res.data);
    } catch (err) {
      console.error(err);
      setBranchOps(null);
    } finally {
      setLoadingOps(false);
    }
  }, [activeBranch?.id]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login', { replace: true });
      return;
    }
    if (requiresBranchSelection) {
      navigate('/branch/select', { replace: true });
      return;
    }
    fetchGlobal();
  }, [user, requiresBranchSelection, navigate, fetchGlobal]);

  useEffect(() => {
    fetchBranchOps();
  }, [fetchBranchOps]);

  if (loadingGlobal && !globalData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-t-transparent rounded-xl animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const branches = globalData?.branches || [];
  const totals = globalData?.totals || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Admin <span className="text-primary">Dashboard</span>
        </h1>
        <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
          Welcome back, <span className="text-primary font-bold">{user?.first_name || user?.username}</span>.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-3 border border-red-200">
          <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* SECTION A — Global Overview */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Global Overview</h2>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">All branches</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total revenue today</p>
            <p className="text-2xl font-bold text-emerald-600">{formatMoney(totals.total_revenue_today)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total sales today</p>
            <p className="text-2xl font-bold text-indigo-600">{totals.total_sales_today ?? 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Low stock (all branches)</p>
            <p className="text-2xl font-bold text-rose-600">{totals.total_low_stock ?? 0}</p>
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
                  <p className="text-xs text-gray-500 mt-0.5">{formatBranchType(branch.type)}</p>
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
              <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                — {activeBranch.name}
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

        {!activeBranch?.id && (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center text-gray-500">
            <p className="font-medium">No active branch selected.</p>
            <p className="text-sm mt-2">Choose a branch to see alerts, transactions, and transfers.</p>
          </div>
        )}

        {activeBranch?.id && loadingOps && (
          <div className="flex justify-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        )}

        {activeBranch?.id && !loadingOps && branchOps && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                Low stock ({branchOps.low_stock_count})
              </h3>
              {branchOps.low_stock_alerts?.length ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {branchOps.low_stock_alerts.map((item) => (
                    <li key={item.product_id} className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{item.product_name}</span>
                      <span className="text-rose-600 font-bold">{item.quantity} left</span>
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
                Expiry alerts ({branchOps.expiry_count})
              </h3>
              {branchOps.expiry_alerts?.length ? (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {branchOps.expiry_alerts.map((item) => (
                    <li key={item.product_id} className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{item.product_name}</span>
                      <span className="text-gray-500">{item.expiry_date}</span>
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
                    <li key={t.id} className="flex flex-wrap justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 text-sm">
                      <span className="font-medium">{t.product_name} × {t.quantity}</span>
                      <span className="text-gray-500">
                        {t.source_branch} → {t.destination_branch}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No pending transfers.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
