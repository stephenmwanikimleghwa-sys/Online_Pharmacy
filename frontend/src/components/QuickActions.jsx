import React from 'react';

const QuickActions = ({ onQuickSale, onAddPrescription, onViewReports, onViewInventory }) => {
  return (
    <div className="glass-card rounded-2xl p-6 border shadow-premium" style={{borderColor:'var(--border-primary)'}}>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg" style={{background:'var(--brand-mist)'}}>
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <h2 className="text-xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>Quick Operations</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <button
          onClick={onQuickSale}
          className="flex flex-col items-center justify-center p-6 data-cell hover:shadow-glow rounded-2xl transition-all duration-300 group active:scale-[0.98]"
        >
          <div className="w-14 h-14 btn-primary rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{color:'var(--text-primary)'}}>Quick Sale</span>
        </button>

        <button
          onClick={onAddPrescription}
          className="flex flex-col items-center justify-center p-6 data-cell hover:shadow-glow rounded-2xl transition-all duration-300 group active:scale-[0.98]"
        >
          <div className="w-14 h-14 btn-primary rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{color:'var(--text-primary)'}}>New Script</span>
        </button>

        <button
          onClick={onViewReports}
          className="flex flex-col items-center justify-center p-6 data-cell hover:shadow-premium rounded-2xl transition-all duration-300 group active:scale-[0.98]"
        >
          <div className="w-14 h-14 btn-primary rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{color:'var(--text-primary)'}}>Analytics</span>
        </button>

        <button
          onClick={onViewInventory}
          className="flex flex-col items-center justify-center p-6 data-cell hover:shadow-premium rounded-2xl transition-all duration-300 group active:scale-[0.98]"
        >
          <div className="w-14 h-14 btn-primary rounded-2xl flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight" style={{color:'var(--text-primary)'}}>Inventory</span>
        </button>

      </div>
    </div>
  );
};

export default QuickActions;
