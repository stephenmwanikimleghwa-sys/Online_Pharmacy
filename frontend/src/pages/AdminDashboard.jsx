import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranchParam } from '../hooks/useBranchParam';
import api from '../services/api';
import { UserIcon, ChartBarIcon, BuildingOffice2Icon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const { user, token, activeBranch } = useAuth();
  const { branchParams, isAllBranches } = useBranchParam();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({ totalUsers: 0, totalPharmacies: 0 });
  const [branchSummary, setBranchSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        setUsers(usersData);
        setStats({ totalUsers: usersData.length, totalPharmacies: 0 });

        // Fetch branch summary
        try {
          if (isAllBranches || activeBranch === null) {
            const summaryRes = await api.get('/auth/branches/summary/');
            setBranchSummary(summaryRes.data?.totals || summaryRes.data);
          } else if (activeBranch?.id) {
            const summaryRes = await api.get(`/auth/branches/${activeBranch.id}/summary/`);
            setBranchSummary(summaryRes.data);
          }
        } catch (summaryErr) {
          console.warn('Branch summary unavailable', summaryErr);
        }
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token, navigate, location, activeBranch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 opacity-40">
          <div className="w-10 h-10 border-[3px] border-t-transparent rounded-xl animate-spin" style={{borderColor:'var(--color-primary)', borderTopColor:'transparent'}}></div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-glow">
            <ChartBarIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>
            Admin <span className="text-primary">Dashboard</span>
          </h1>
        </div>
        <p className="text-lg font-medium" style={{color:'var(--text-secondary)'}}>
          Welcome back, <span className="text-primary font-bold">{user.full_name || user.username}</span>. Monitor system growth and manage core assets.
        </p>
      </div>

      {error && (
        <div className="mb-8 alert-error rounded-2xl p-4 flex items-center gap-4 animate-shake">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'rgba(220,38,38,0.12)'}}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="font-bold text-sm tracking-tight">{error}</p>
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-12">

        {/* Stats Section */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card rounded-2xl p-6" style={{borderLeft:'4px solid var(--color-primary)'}}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{background:'var(--brand-mist)'}}>
                <UserIcon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>Total Users</p>
                <p className="text-3xl font-display font-bold" style={{color:'var(--text-primary)'}}>{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          {/* Branch stats card */}
          {branchSummary && (
            <>
              <div className="glass-card rounded-2xl p-6" style={{borderLeft:'4px solid #10b981'}}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl" style={{background:'rgba(16,185,129,0.1)'}}>
                    <CurrencyDollarIcon className="h-7 w-7" style={{color:'#10b981'}} />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>Sales Today</p>
                    <p className="text-3xl font-display font-bold" style={{color:'var(--text-primary)'}}>KSh {(branchSummary.sales_today || 0).toLocaleString()}</p>
                    <p className="text-xs mt-1" style={{color:'var(--text-secondary)'}}>{branchSummary.transactions_today || 0} transactions</p>
                  </div>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6" style={{borderLeft:'4px solid var(--color-accent)'}}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl" style={{background:'var(--brand-soft)'}}>
                    <BuildingOffice2Icon className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>Active Staff</p>
                    <p className="text-3xl font-display font-bold" style={{color:'var(--text-primary)'}}>{branchSummary.active_staff || 0}</p>
                    <p className="text-xs mt-1" style={{color:'var(--text-secondary)'}}>
                      {activeBranch ? activeBranch.name : 'All Branches'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {!branchSummary && (
          <div className="glass-card rounded-2xl p-6" style={{borderLeft:'4px solid var(--color-accent)'}}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl" style={{background:'var(--brand-soft)'}}>
                <ChartBarIcon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider" style={{color:'var(--text-secondary)'}}>System Health</p>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-xl font-display font-bold" style={{color:'var(--text-primary)'}}>Operational</p>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Featured Action Cell */}
          <div className="btn-primary rounded-2xl p-6 shadow-glow text-white overflow-hidden relative group">
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-1">Reports & Analytics</h3>
              <p className="text-white/70 text-sm mb-4">Review system-wide performance and dispensing trends.</p>
              <button
                onClick={() => navigate('/reports')}
                className="w-full py-2 bg-white text-primary font-bold rounded-xl shadow-lg transform group-hover:scale-[1.02] transition-all"
                style={{color:'var(--color-primary)'}}
              >
                Open Analytics
              </button>
            </div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          </div>
        </div>

        {/* Users Table */}
        <div className="lg:col-span-8 glass-card rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center justify-between" style={{borderColor:'var(--border-primary)', background:'var(--bg-field)'}}>
            <h2 className="text-xl font-display font-bold" style={{color:'var(--text-primary)'}}>Recent Users</h2>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-primary hover:text-primary text-sm font-bold"
            >
              View All Users →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{borderColor:'var(--border-primary)'}}>
              <thead className="table-header-row">
                <tr>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Username</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Role</th>
                  <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{borderColor:'var(--border-primary)'}}>
                {users.slice(0, 3).map((userItem) => (
                  <tr key={userItem.id} className="transition-colors" style={{}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-field)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold" style={{color:'var(--text-primary)'}}>{userItem.username}</div>
                      <div className="text-xs" style={{color:'var(--text-secondary)'}}>{userItem.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{background:'var(--brand-mist)', color:'var(--text-primary)'}}>
                        {userItem.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${userItem.is_verified ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${userItem.is_verified ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
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

    </div>
  );
};

export default AdminDashboard;
