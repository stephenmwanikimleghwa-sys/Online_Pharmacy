import React, { useEffect, useState, useRef } from 'react';
import { useAuth, BranchInfo } from '../context/AuthContext';
import api from '../services/api';

interface BranchSummary {
  id: number | 'all';
  name: string;
  is_headquarters?: boolean;
  is_active?: boolean;
  sales_today?: number;
  transactions_today?: number;
}

const BranchSelector: React.FC = () => {
  const { user, activeBranch, setActiveBranch } = useAuth();
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only render for admin users
  const isAdmin = user?.role === 'admin' || user?.is_admin;
  if (!isAdmin) return null;

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/auth/branches/');
        const data: BranchSummary[] = res.data?.results || res.data || [];
        setBranches(data);
      } catch (err) {
        console.error('Failed to fetch branches', err);
      }
    };
    fetchBranches();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (branch: BranchInfo | null) => {
    setActiveBranch(branch);
    setOpen(false);
  };

  const displayLabel = activeBranch ? activeBranch.name : '🏢 All Branches';

  return (
    <div
      ref={dropdownRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* Trigger button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        title="Switch branch"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          border: '1px solid var(--border)',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          color: 'var(--text-primary)',
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-alpha)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        }}
      >
        <span style={{ fontSize: '1rem' }}>🏥</span>
        <span>{displayLabel}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            opacity: 0.7,
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: '220px',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'fadeSlideDown 0.15s ease',
          }}
        >
          {/* "All Branches" option */}
          <button
            onClick={() => handleSelect(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '10px 14px',
              background: activeBranch === null ? 'var(--primary-alpha)' : 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: activeBranch === null ? 700 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => {
              if (activeBranch !== null) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)';
            }}
            onMouseLeave={e => {
              if (activeBranch !== null) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <span>🏢</span>
            <span>All Branches</span>
            {activeBranch === null && (
              <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: '0.9rem' }}>✓</span>
            )}
          </button>

          {/* Individual branches */}
          {branches.filter(b => b.is_active !== false).map(branch => {
            const isSelected = activeBranch?.id === branch.id;
            return (
              <button
                key={branch.id}
                onClick={() => handleSelect({ id: branch.id, name: branch.name, is_headquarters: branch.is_headquarters })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 14px',
                  background: isSelected ? 'var(--primary-alpha)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? 700 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)';
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                <span>{branch.is_headquarters ? '⭐' : '📍'}</span>
                <span style={{ flex: 1 }}>{branch.name}</span>
                {isSelected && (
                  <span style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>✓</span>
                )}
              </button>
            );
          })}

          {branches.length === 0 && (
            <p style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
              No branches found
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BranchSelector;
