import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getBranchIcon, getBranchSubtitle } from '../utils/branchDisplay';

const WelcomeBanner = () => {
  const { user, activeBranch } = useAuth();

  if (!user) return null;

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  const userName = user?.full_name || user?.first_name || user?.last_name || user?.username || 'User';
  const isPharmacist = user?.role === 'pharmacist';
  const branchLabel = activeBranch?.name || user?.branch_info?.name;

  return (
    <div
      className="relative overflow-hidden mb-8 px-6 py-5 md:px-7 md:py-6"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: 'var(--radius-surface)',
        borderLeft: '3px solid var(--color-primary)',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1
            className="text-2xl md:text-3xl font-display font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Good {getTimeOfDay()}, {userName}
          </h1>
          {isPharmacist && branchLabel ? (
            <p className="mt-2 text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {getBranchIcon(activeBranch || {})} {branchLabel}
              </span>
              {activeBranch && (
                <span className="block mt-0.5">
                  {getBranchSubtitle(activeBranch)} — branch operations
                </span>
              )}
            </p>
          ) : (
            <p className="mt-1.5 text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>
              Your workspace for today.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
