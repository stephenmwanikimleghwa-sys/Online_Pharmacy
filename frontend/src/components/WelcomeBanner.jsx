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

  const userName = user?.first_name || user?.username || 'User';
  const isPharmacist = user?.role === 'pharmacist';
  const branchLabel = activeBranch?.name || user?.branch_info?.name;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-8 mb-8 shadow-premium text-white"
      style={{ background: 'var(--btn-gradient)' }}
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            Good {getTimeOfDay()}, {userName}!
          </h1>
          {isPharmacist && branchLabel ? (
            <p className="mt-3 text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.95)' }}>
              {getBranchIcon(activeBranch || {})} {branchLabel}
              {activeBranch && (
                <span className="block text-base font-normal mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {getBranchSubtitle(activeBranch)} — branch operations only
                </span>
              )}
            </p>
          ) : (
            <p className="mt-2 text-lg max-w-2xl" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Welcome back. Here is your workspace for today.
            </p>
          )}
        </div>
        <div className="hidden lg:block">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-4xl">
            {isPharmacist && activeBranch ? getBranchIcon(activeBranch) : '💊'}
          </div>
        </div>
      </div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none -translate-x-1/2 translate-y-1/2" />
    </div>
  );
};

export default WelcomeBanner;
