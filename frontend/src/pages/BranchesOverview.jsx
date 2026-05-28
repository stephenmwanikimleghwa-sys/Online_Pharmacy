import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowPathIcon,
  PlusIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

const StatCard = ({ label, value, sub, color = 'var(--color-primary)' }) => (
  <div style={{ flex: 1 }}>
    <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
    <p style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</p>}
  </div>
);

const BranchCard = ({ branch, onSelect, isActive }) => {
  const navigate = useNavigate();
  const pendingStyle = branch.pending_restock > 0
    ? { color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700 }
    : { color: 'var(--text-secondary)', fontSize: '0.7rem' };

  return (
    <div
      style={{
        background: isActive ? 'var(--primary-alpha)' : 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: 20,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        transition: 'all 0.2s ease',
        boxShadow: isActive ? '0 0 0 3px rgba(124,58,237,0.12)' : '0 4px 24px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: branch.is_headquarters ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'var(--btn-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {branch.is_headquarters
              ? <StarIcon style={{ width: 20, height: 20, color: '#fff' }} />
              : <BuildingOffice2Icon style={{ width: 20, height: 20, color: '#fff' }} />
            }
          </div>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>
              {branch.name}
            </h3>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: branch.is_headquarters ? '#f59e0b' : 'var(--text-secondary)' }}>
              {branch.is_headquarters ? '⭐ Headquarters' : '📍 Branch'}
            </span>
          </div>
        </div>
        {/* Active badge */}
        <span style={{
          fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
          padding: '4px 10px', borderRadius: 20,
          background: branch.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
          color: branch.is_active ? '#10b981' : '#ef4444',
          flexShrink: 0,
        }}>
          {branch.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, padding: '16px', background: 'var(--surface)', borderRadius: 14 }}>
        <StatCard
          label="Sales Today"
          value={`KSh ${Number(branch.sales_today || 0).toLocaleString()}`}
          sub={`${branch.transactions_today || 0} transactions`}
        />
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        <StatCard
          label="This Month"
          value={`KSh ${Number(branch.sales_this_month || 0).toLocaleString()}`}
        />
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        <StatCard
          label="Staff"
          value={branch.active_staff || 0}
          sub="active users"
        />
      </div>

      {/* Restock alert */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={pendingStyle}>
          {branch.pending_restock > 0
            ? `⚠ ${branch.pending_restock} pending restock${branch.pending_restock > 1 ? 's' : ''}`
            : '✓ No pending restocks'}
        </span>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/admin/restock-requests')}
            title="View restock requests"
            style={{
              padding: '6px 12px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            Restocks
          </button>
          <button
            onClick={() => onSelect(branch)}
            style={{
              padding: '6px 14px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700,
              border: 'none',
              background: isActive ? 'var(--primary)' : 'var(--btn-gradient)',
              color: '#fff', cursor: 'pointer', transition: 'all 0.15s',
              opacity: isActive ? 0.6 : 1,
            }}
          >
            {isActive ? 'Selected ✓' : 'View Branch'}
          </button>
        </div>
      </div>
    </div>
  );
};

const BranchesOverview = () => {
  const { user, activeBranch, setActiveBranch } = useAuth();
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    fetchSummary();
  }, [user]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/branches/summary/');
      setBranches(res.data?.branches || []);
      setTotals(res.data?.totals || null);
    } catch (err) {
      setError('Failed to load branch overview. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBranch = (branch) => {
    setActiveBranch({ id: branch.id, name: branch.name, is_headquarters: branch.is_headquarters });
    navigate('/admin/dashboard');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-secondary)' }}>Loading branches...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--btn-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}>
              <BuildingOffice2Icon style={{ width: 24, height: 24, color: '#fff' }} />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Branch <span style={{ color: 'var(--primary)' }}>Overview</span>
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500, margin: 0 }}>
            At-a-glance stats for all {branches.length} branch{branches.length !== 1 ? 'es' : ''} — today's performance
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchSummary}
            title="Refresh"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              borderRadius: 12, border: '1px solid var(--border)', background: 'var(--glass-bg)',
              color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
            }}
          >
            <ArrowPathIcon style={{ width: 16, height: 16 }} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/admin/branches/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
              borderRadius: 12, border: 'none', background: 'var(--btn-gradient)',
              color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(124,58,237,0.25)',
            }}
          >
            <PlusIcon style={{ width: 16, height: 16 }} />
            Add Branch
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 24, padding: '14px 18px', borderRadius: 14, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Totals banner */}
      {totals && (
        <div style={{
          background: 'var(--btn-gradient)', borderRadius: 20, padding: '24px 32px',
          marginBottom: 32, display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center',
          color: '#fff', boxShadow: '0 8px 32px rgba(124,58,237,0.25)',
        }}>
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', opacity: 0.7, marginBottom: 4 }}>All Branches · Today</p>
            <p style={{ fontSize: '1.9rem', fontWeight: 800, lineHeight: 1, margin: 0 }}>KSh {Number(totals.sales_today || 0).toLocaleString()}</p>
            <p style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: 2 }}>{totals.transactions_today || 0} transactions</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', height: 48 }} />
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', opacity: 0.7, marginBottom: 4 }}>This Month</p>
            <p style={{ fontSize: '1.9rem', fontWeight: 800, lineHeight: 1, margin: 0 }}>KSh {Number(totals.sales_this_month || 0).toLocaleString()}</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', height: 48 }} />
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', opacity: 0.7, marginBottom: 4 }}>Active Staff</p>
            <p style={{ fontSize: '1.9rem', fontWeight: 800, lineHeight: 1, margin: 0 }}>{totals.active_staff || 0}</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.2)', height: 48 }} />
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.13em', opacity: 0.7, marginBottom: 4 }}>Pending Restocks</p>
            <p style={{ fontSize: '1.9rem', fontWeight: 800, lineHeight: 1, margin: 0 }}>{totals.pending_restock || 0}</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => { setActiveBranch(null); navigate('/admin/dashboard'); }}
              style={{ padding: '10px 20px', borderRadius: 12, border: '2px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              View All Branches Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Branch cards grid */}
      {branches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-secondary)' }}>
          <BuildingOffice2Icon style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>No branches found</p>
          <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Create your first branch to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {branches.map(branch => (
            <BranchCard
              key={branch.id}
              branch={branch}
              isActive={activeBranch?.id === branch.id}
              onSelect={handleSelectBranch}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BranchesOverview;
