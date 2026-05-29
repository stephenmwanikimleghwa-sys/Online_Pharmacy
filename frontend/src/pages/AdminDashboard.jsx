import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranchParam } from '../hooks/useBranchParam';
import api from '../services/api';
import { 
  UserGroupIcon, 
  BuildingOffice2Icon, 
  ExclamationTriangleIcon, 
  ClockIcon, 
  ChartBarIcon, 
  CurrencyDollarIcon,
  BellAlertIcon,
  TruckIcon,
  UsersIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const { user, token, activeBranch } = useAuth();
  const { branchParams, isAllBranches } = useBranchParam();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({ totalUsers: 0, activeBranches: 0 });
  const [branchSummary, setBranchSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [allBranches, setAllBranches] = useState([]);

  // Variables for dynamic data
  const lowStockAlerts = branchSummary?.low_stock_items || 0;
  const expiringProducts = branchSummary?.expiring_products || 0;
  const pendingTransfers = branchSummary?.pending_transfers || 0;
  const pendingCreditCustomers = branchSummary?.pending_credit_customers || 0;
  const activeStaff = branchSummary?.active_staff || 0;
  const salesToday = branchSummary?.sales_today || 0;
  
  const branchStockOverview = allBranches.map(b => ({
    id: b.id,
    name: b.name,
    products: b.total_products || 0,
    lowStock: b.low_stock_items || 0
  }));

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch users list
        const usersRes = await api.get('/auth/admin/users/').catch((err) => {
          console.warn('Failed to load users for dashboard', err);
          return { data: [] };
        });
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.results ?? []);
        
        // Fetch branch summary
        let fetchedBranchSummary = null;
        let branchesCount = 0;
        try {
          if (isAllBranches || activeBranch === null) {
            const summaryRes = await api.get('/auth/branches/summary/');
            fetchedBranchSummary = summaryRes.data?.totals || summaryRes.data;
            const branches = summaryRes.data?.branches || [];
            setAllBranches(branches);
            branchesCount = branches.length;
          } else if (activeBranch?.id) {
            const summaryRes = await api.get(`/auth/branches/${activeBranch.id}/summary/`);
            fetchedBranchSummary = summaryRes.data;
            setAllBranches([summaryRes.data]);
            branchesCount = 1;
          }
        } catch (summaryErr) {
          console.warn('Branch summary unavailable', summaryErr);
        }

        setUsers(usersData);
        setBranchSummary(fetchedBranchSummary);
        setStats({ 
          totalUsers: usersData.length, 
          activeBranches: branchesCount || allBranches.length || 0
        });

      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token, navigate, location, activeBranch]);

  // For users array if needed in quick list, keeping a stub
  const [users, setUsers] = useState([]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4 opacity-40">
          <div className="w-10 h-10 border-[3px] border-t-transparent rounded-xl animate-spin" style={{borderColor:'var(--color-primary)', borderTopColor:'transparent'}}></div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in font-sans">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>
              Admin <span className="text-primary">Dashboard</span>
            </h1>
            {/* System Health Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              System Health: Operational
            </div>
          </div>
          <p className="text-sm font-medium" style={{color:'var(--text-secondary)'}}>
            Welcome back, <span className="text-primary font-bold">{user.full_name || user.username}</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-500 uppercase">Sales Today</span>
            <span className="text-xl font-bold text-emerald-600">KSh {salesToday.toLocaleString()}</span>
          </div>
          <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-500 uppercase">Active Staff</span>
            <span className="text-xl font-bold text-indigo-600">{activeStaff} Online</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-4 animate-shake border border-red-200">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <p className="font-bold text-sm tracking-tight">{error}</p>
        </div>
      )}

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
              <UserGroupIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Users</p>
          <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <BuildingOffice2Icon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Active Branches</p>
          <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{stats.activeBranches}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <BellAlertIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Low Stock Alerts</p>
          <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{lowStockAlerts}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
              <ClockIcon className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Expiring Products</p>
          <p className="text-3xl font-display font-bold text-gray-900 dark:text-white">{expiringProducts}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Operational Alerts Card */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
            Actionable Alerts
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                  <BellAlertIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Low Stock Items</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Products at or below reorder level across branches</p>
                </div>
              </div>
              <span className="font-bold text-rose-600">{lowStockAlerts} items</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <TruckIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Pending Transfers</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Inter-branch transfers awaiting approval</p>
                </div>
              </div>
              <span className="font-bold text-blue-600">{pendingTransfers} requests</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <CurrencyDollarIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Credit Customers</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customers with outstanding balances</p>
                </div>
              </div>
              <span className="font-bold text-amber-600">{pendingCreditCustomers} pending</span>
            </div>
          </div>
        </div>

        {/* Quick Links / Modules */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Quick Links</h2>
          <div className="space-y-3">
            <button onClick={() => navigate('/admin/users')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600 text-left">
              <div className="flex items-center gap-3">
                <UsersIcon className="w-5 h-5 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Manage Users</span>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => navigate('/inventory')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600 text-left">
              <div className="flex items-center gap-3">
                <BuildingStorefrontIcon className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Inventory Module</span>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => navigate('/admin/branches')} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600 text-left">
              <div className="flex items-center gap-3">
                <BuildingOffice2Icon className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Branches</span>
              </div>
              <ArrowRightIcon className="w-4 h-4 text-gray-400" />
            </button>
            
            {/* Prominent Reports Button */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => navigate('/reports')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
              >
                <ChartBarIcon className="w-5 h-5" />
                Reports & Analytics
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Stock Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Branch Stock Overview</h2>
          <button onClick={() => navigate('/inventory')} className="text-sm text-indigo-600 font-bold hover:text-indigo-700">View Detailed Inventory &rarr;</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {branchStockOverview.map(branch => (
            <div key={branch.id} className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">{branch.name}</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Products</span>
                  <span className="font-bold text-gray-900 dark:text-white">{branch.products.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Low Stock</span>
                  <span className="font-bold text-rose-600">{branch.lowStock}</span>
                </div>
              </div>
              <div className="mt-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(100, branch.products > 0 ? (branch.products / 1500) * 100 : 0)}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default AdminDashboard;
