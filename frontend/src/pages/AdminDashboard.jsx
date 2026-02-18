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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-10">
        <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-lg text-slate-500">
          Welcome back, <span className="text-primary-600 font-semibold">{user.full_name || user.username}</span>. Monitor system growth and manage core assets.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 mb-10">

        {/* Stats Section - Bento Cells */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-primary-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-50 rounded-xl">
                <UserIcon className="h-7 w-7 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Users</p>
                <p className="text-3xl font-display font-bold text-slate-800">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-secondary-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary-50 rounded-xl">
                <ChartBarIcon className="h-7 w-7 text-secondary-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">System Health</p>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-secondary-500 rounded-full animate-pulse-subtle"></span>
                  <p className="text-xl font-display font-bold text-slate-800">Operational</p>
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
        <div className="lg:col-span-8 glass-card rounded-2xl p-0 overflow-hidden border border-slate-100">
          <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-xl font-display font-bold text-slate-800">Recent Accounts</h2>
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
                  <tr key={userItem.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-slate-800">{userItem.username}</div>
                      <div className="text-xs text-slate-400">{userItem.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
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
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-primary-500 hover:shadow-card transition-all group"
        >
          <span className="font-bold text-slate-700 group-hover:text-primary-600">User Management</span>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-primary-500 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          onClick={() => navigate('/admin/stock')}
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-secondary-500 hover:shadow-card transition-all group"
        >
          <span className="font-bold text-slate-700 group-hover:text-secondary-600">Inventory Control</span>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-secondary-500 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          onClick={() => navigate('/dispensing-logs')}
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-accent-500 hover:shadow-card transition-all group"
        >
          <span className="font-bold text-slate-700 group-hover:text-accent-600">Audit Logs</span>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-accent-500 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        <button
          onClick={() => navigate('/reports')}
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-500 hover:shadow-card transition-all group"
        >
          <span className="font-bold text-slate-700 group-hover:text-purple-600">Reports Panel</span>
          <svg className="w-5 h-5 text-slate-400 group-hover:text-purple-500 translate-x-0 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
