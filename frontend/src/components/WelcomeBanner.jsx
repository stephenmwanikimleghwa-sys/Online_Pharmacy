import React from 'react';
import { useAuth } from '../context/AuthContext';

const WelcomeBanner = () => {
  const { user } = useAuth();

  if (!user) return null;

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  // Ensure we have the required user properties
  const userName = user?.first_name || user?.username || 'User';
  const userRole = user?.role || 'user';

  return (
    <div className="relative overflow-hidden rounded-2xl p-8 mb-8 shadow-premium text-white" style={{ background: 'var(--btn-gradient)' }}>
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
            Good {getTimeOfDay()}, {userName}! 👋
          </h1>
          <p className="mt-2 text-lg max-w-2xl" style={{color:'rgba(255,255,255,0.85)'}}>
            Welcome back to your {userRole} dashboard. Here's a curated overview of your pharmacy's operations today.
          </p>
        </div>
        <div className="hidden lg:block">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
            <span className="text-3xl">💊</span>
          </div>
        </div>
      </div>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -u-translate-y-1/2 translate-x-1/2 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
    </div>
  );
};

export default WelcomeBanner;