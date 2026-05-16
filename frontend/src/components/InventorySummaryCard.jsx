import React from 'react';

const InventorySummaryCard = ({ summary, onViewInventory }) => {
  const {
    totalProducts = 0,
    lowStockItems = 0,
    outOfStockItems = 0
  } = summary;

  return (
    <div className="glass-card rounded-2xl p-6 border border-white/50 shadow-premium">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>Inventory Summary</h2>
          <p className="text-sm mt-1" style={{color:'var(--text-secondary)'}}>Quick view of your current stock.</p>
        </div>
        <button
          onClick={onViewInventory}
          className="px-5 py-2.5 btn-primary text-white rounded-xl font-bold shadow-soft hover:shadow-glow  transition-all active:scale-[0.98] text-sm"
        >
          View stock list
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Products */}
        <div className="data-cell p-5 rounded-2xl group hover:shadow-premium transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-primary">Total Products</p>
              <p className="text-3xl font-display font-bold" style={{color:'var(--text-primary)'}}>{totalProducts}</p>
            </div>
            <div className="w-12 h-12 btn-primary rounded-xl flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </div>

        {/* Low Stock */}
        <div className={`p-5 rounded-2xl border transition-all group ${lowStockItems > 0 ? 'bg-amber-50/50 border-amber-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${lowStockItems > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>Low Stock Items</p>
              <p className={`text-3xl font-display font-bold ${lowStockItems > 0 ? 'text-amber-900' : 'text-emerald-900'}`}>
                {lowStockItems}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform ${lowStockItems > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Out of Stock */}
        <div className={`p-5 rounded-2xl border transition-all group ${outOfStockItems > 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${outOfStockItems > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>Out of Stock</p>
              <p className={`text-3xl font-display font-bold ${outOfStockItems > 0 ? 'text-rose-900' : 'text-emerald-900'}`}>
                {outOfStockItems}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-soft group-hover:scale-110 transition-transform ${outOfStockItems > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {lowStockItems > 0 && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100/50 rounded-xl">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-lg text-amber-500 font-bold shadow-sm">!</span>
            <p className="text-sm font-semibold text-amber-800">
              {lowStockItems} product{lowStockItems !== 1 ? 's' : ''} running low on stock
            </p>
          </div>
        )}

        {outOfStockItems > 0 && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100/50 rounded-xl">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded-lg text-rose-500 font-bold shadow-sm">!</span>
            <p className="text-sm font-semibold text-rose-800">
              {outOfStockItems} product{outOfStockItems !== 1 ? 's' : ''} out of stock
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventorySummaryCard;
