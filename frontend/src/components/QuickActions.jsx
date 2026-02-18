import React from 'react';

const QuickActions = ({ onAddPrescription, onViewReports, onViewInventory }) => {
  return (
    <div className="glass-card rounded-2xl p-6 border border-white/50 shadow-premium">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <h2 className="text-xl font-display font-bold text-slate-800 tracking-tight">Quick Operations</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <button
          onClick={onAddPrescription}
          className="flex flex-col items-center justify-center p-6 bg-indigo-50/50 hover:bg-white rounded-2xl transition-all duration-300 group border border-indigo-100/50 hover:border-indigo-200 hover:shadow-glow active:scale-[0.98]"
        >
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-4 ring-indigo-50 group-hover:ring-indigo-100">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-700 tracking-tight">New Script</span>
        </button>

        <button
          onClick={onViewReports}
          className="flex flex-col items-center justify-center p-6 bg-violet-50/50 hover:bg-white rounded-2xl transition-all duration-300 group border border-violet-100/50 hover:border-violet-200 hover:shadow-soft active:scale-[0.98]"
        >
          <div className="w-14 h-14 bg-violet-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-4 ring-violet-50 group-hover:ring-violet-100">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-700 tracking-tight">Analytics</span>
        </button>

        <button
          onClick={onViewInventory}
          className="flex flex-col items-center justify-center p-6 bg-emerald-50/50 hover:bg-white rounded-2xl transition-all duration-300 group border border-emerald-100/50 hover:border-emerald-200 hover:shadow-soft active:scale-[0.98]"
        >
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-4 ring-emerald-50 group-hover:ring-emerald-100">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-700 tracking-tight">Inventory</span>
        </button>

        <button className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-white rounded-2xl transition-all duration-300 group border border-slate-100 hover:border-indigo-200 hover:shadow-soft active:scale-[0.98]">
          <div className="w-14 h-14 bg-slate-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300 group-hover:bg-indigo-600 ring-4 ring-slate-100 group-hover:ring-indigo-50">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-700 tracking-tight">Verify All</span>
        </button>
      </div>
    </div>
  );
};

export default QuickActions;
