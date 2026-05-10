import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { UserIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPharmacies: 0
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Role protection: redirect if not admin
    if (!user || user.role !== 'admin') {
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch users (admin users endpoint exists)
        const usersRes = await api.get('/auth/admin/users/').catch((err) => {
          console.warn('Failed to load users for dashboard', err);
          return { data: [] };
        });

        // Normalize responses: some APIs return paginated objects {results: [...]} or objects instead of arrays.
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.results ?? []);
        // We don't use pharmacies in this deployment. Treat as empty.
        const pharmaciesData = [];

        setUsers(usersData);
        setStats({
          totalUsers: usersData.length,
          totalPharmacies: pharmaciesData.length
        });
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 opacity-40">
          <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-xl animate-spin shadow-glow-indigo"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-glow">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            Admin <span className="text-indigo-600 dark:text-indigo-400">Dashboard</span>
          </h1>
        </div>
        <p className="text-lg text-slate-500 font-medium">
          Welcome back, <span className="text-indigo-600 font-bold">{user.full_name || user.username}</span>. Monitor system growth and manage core assets.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 animate-shake">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="text-rose-900 font-bold text-sm tracking-tight">{error}</p>
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-12">

        {/* Stats Section - Bento Cells */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-primary-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-50 rounded-xl">
                <UserIcon className="h-7 w-7 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Users</p>
                <p className="text-3xl font-display font-bold text-slate-800 dark:text-white">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-secondary-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary-50 rounded-xl">
                <ChartBarIcon className="h-7 w-7 text-secondary-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">System Health</p>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-secondary-500 rounded-full animate-pulse-subtle"></span>
                  <p className="text-xl font-display font-bold text-slate-800 dark:text-white">Operational</p>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Action Cell */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-card text-white overflow-hidden relative group">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-1">Reports & Analytics</h3>
              <p className="text-slate-400 text-sm mb-4">Review system-wide performance and dispensing trends.</p>
              <button
                onClick={() => navigate('/reports')}
                className="w-full py-2 bg-white text-slate-900 font-bold rounded-xl shadow-lg transform group-hover:scale-[1.02] transition-all"
              >
                Open Analytics
              </button>
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl"></div>
          </div>
        </div>

        {/* Users Table - Large Bento Cell */}
        <div className="lg:col-span-8 glass-card rounded-2xl p-0 overflow-hidden border border-slate-100 dark:border-slate-800/60">
          <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800/60 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/40">
            <h2 className="text-xl font-display font-bold text-slate-800 dark:text-white">Recent Accounts</h2>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-primary-600 hover:text-primary-700 text-sm font-bold"
            >
              View All Users →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Username</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.slice(0, 6).map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{userItem.username}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{userItem.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                        {userItem.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${userItem.is_verified
                        ? 'bg-secondary-50 text-secondary-600 border border-secondary-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${userItem.is_verified ? 'bg-secondary-500' : 'bg-amber-500'}`}></span>
                        {userItem.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-card hover:border-indigo-200 dark:hover:border-indigo-500 transition-all group"
        >
          <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-sm transition-colors">User Management</span>
          <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          onClick={() => navigate('/admin/stock')}
          className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-card hover:border-emerald-200 dark:hover:border-emerald-500 transition-all group"
        >
          <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 text-sm transition-colors">Inventory Control</span>
          <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          onClick={() => navigate('/dispensing-logs')}
          className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-card hover:border-amber-200 dark:hover:border-amber-500 transition-all group"
        >
          <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 text-sm transition-colors">Audit Logs</span>
          <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          onClick={() => navigate('/reports')}
          className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-card hover:border-violet-200 dark:hover:border-violet-500 transition-all group"
        >
          <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 text-sm transition-colors">Reports Panel</span>
          <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-violet-500 dark:group-hover:text-violet-400 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
