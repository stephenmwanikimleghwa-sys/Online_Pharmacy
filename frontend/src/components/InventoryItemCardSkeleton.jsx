import React from 'react';

const InventoryItemCardSkeleton = () => {
  return (
    <div className="glass-card rounded-3xl p-6 border border-white/10 shadow-premium animate-pulse h-full flex flex-col">
      {/* Header section skeleton */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-slate-700/50"></div>
            <div className="h-3 bg-slate-700/50 rounded w-20"></div>
          </div>
          <div className="h-6 bg-slate-600/60 rounded w-3/4"></div>
        </div>
        <div className="h-6 w-16 bg-slate-700/50 rounded-xl"></div>
      </div>

      {/* Grid section skeleton */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
          <div className="h-2.5 bg-slate-700/50 rounded w-12 mb-2"></div>
          <div className="flex items-baseline gap-1 mt-3">
            <div className="h-8 bg-slate-600/60 rounded w-10"></div>
            <div className="h-2.5 bg-slate-700/50 rounded w-6"></div>
          </div>
        </div>
        <div className="p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
          <div className="h-2.5 bg-slate-700/50 rounded w-20 mb-2"></div>
          <div className="flex items-baseline gap-1 mt-3">
            <div className="h-6 bg-slate-700/50 rounded w-8"></div>
            <div className="h-2.5 bg-slate-700/50 rounded w-6"></div>
          </div>
        </div>
      </div>

      {/* Expiry info skeleton */}
      <div className="mb-4 p-3 rounded-xl border border-slate-700/30 bg-slate-800/20">
        <div className="h-2.5 bg-slate-700/50 rounded w-16 mb-2"></div>
        <div className="flex justify-between items-center mt-2">
          <div className="h-3 bg-slate-600/60 rounded w-24"></div>
          <div className="h-4 bg-slate-700/50 rounded-lg w-16"></div>
        </div>
      </div>

      {/* Pricing & Buttons skeleton */}
      <div className="flex flex-col gap-5 mt-auto">
        <div className="flex items-center justify-between px-2 py-2 bg-slate-800/20 rounded-xl border border-slate-700/30">
          <div className="h-3 bg-slate-700/50 rounded w-16"></div>
          <div className="h-4 bg-slate-600/60 rounded w-20"></div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1 h-12 bg-primary-600/40 rounded-2xl"></div>
          <div className="h-12 w-12 bg-slate-800/40 rounded-2xl"></div>
        </div>
      </div>
    </div>
  );
};

export default InventoryItemCardSkeleton;
