import React from 'react';

const InventoryItemCard = ({ item, onRestock, onViewLogs }) => {
  const getStockStatusColor = () => {
    if (item.stock_quantity === 0) {
      return 'bg-red-50 text-red-600 border-red-100';
    } else if (item.stock_quantity <= item.reorder_threshold) {
      return 'bg-amber-50 text-amber-600 border-amber-100';
    } else {
      return 'bg-secondary-50 text-secondary-600 border-secondary-100';
    }
  };

  const getStockStatusText = () => {
    if (item.stock_quantity === 0) {
      return 'Out of Stock';
    } else if (item.stock_quantity <= item.reorder_threshold) {
      return 'Low Stock';
    } else {
      return 'In Stock';
    }
  };

  const getExpiryInfo = () => {
    if (!item.expiry_date) return null;
    const expDate = new Date(item.expiry_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    const daysRemaining = Math.ceil((expDate - today) / (24 * 60 * 60 * 1000));
    if (daysRemaining < 0) return { text: 'Expired', days: daysRemaining, type: 'expired' };
    if (daysRemaining <= 30) return { text: `${daysRemaining} days left`, days: daysRemaining, type: 'soon' };
    if (daysRemaining <= 90) return { text: `${daysRemaining} days left`, days: daysRemaining, type: 'near' };
    return { text: `${daysRemaining} days left`, days: daysRemaining, type: 'ok' };
  };

  const expiryInfo = getExpiryInfo();

  return (
    <div className="glass-card rounded-3xl p-6 group border border-white/60 shadow-premium hover:shadow-glow transition-all duration-500 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              {item.category?.replace('_', ' ')}
            </p>
          </div>
          <h3 className="text-xl font-display font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors tracking-tight">
            {item.name}
          </h3>
        </div>
        <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap shadow-sm ${getStockStatusColor()}`}>
          {getStockStatusText()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Quantity</p>
          <div className="flex items-baseline gap-1">
            <p className={`text-3xl font-display font-bold ${item.stock_quantity === 0 ? 'text-rose-600' : item.stock_quantity <= item.reorder_threshold ? 'text-amber-500' : 'text-slate-900'}`}>
              {item.stock_quantity}
            </p>
            <span className="text-[10px] font-bold text-slate-400">units</span>
          </div>
        </div>
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 group-hover:bg-white transition-colors">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">Alert when below</p>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-display font-bold text-slate-600">{item.reorder_threshold}</p>
            <span className="text-[10px] font-bold text-slate-400">min</span>
          </div>
        </div>
      </div>

      {/* Expiry info — always shown */}
      <div className={`mb-4 p-3 rounded-xl border ${!expiryInfo
          ? 'bg-slate-50 border-slate-200'
          : expiryInfo.type === 'expired' ? 'bg-rose-50 border-rose-200'
            : expiryInfo.type === 'soon' ? 'bg-amber-50 border-amber-200'
              : expiryInfo.type === 'near' ? 'bg-sky-50 border-sky-200'
                : 'bg-emerald-50 border-emerald-200'
        }`}>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 ${
          !expiryInfo ? 'text-slate-400' :
          expiryInfo.type === 'expired' ? 'text-rose-500' :
          expiryInfo.type === 'soon' ? 'text-amber-500' :
          expiryInfo.type === 'near' ? 'text-sky-500' : 'text-emerald-500'
        }">Expiry Date</p>
        {!expiryInfo ? (
          <p className="text-xs font-bold text-slate-400">No expiry date recorded</p>
        ) : (
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold ${expiryInfo.type === 'expired' ? 'text-rose-700' :
                expiryInfo.type === 'soon' ? 'text-amber-700' :
                  expiryInfo.type === 'near' ? 'text-sky-700' : 'text-emerald-700'
              }`}>
              {new Date(item.expiry_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${expiryInfo.type === 'expired' ? 'bg-rose-100 text-rose-700' :
                expiryInfo.type === 'soon' ? 'bg-amber-100 text-amber-700' :
                  expiryInfo.type === 'near' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
              {expiryInfo.type === 'expired' ? '⚠ EXPIRED' : `${expiryInfo.days} days left`}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {item.price && (
          <div className="flex items-center justify-between px-2 py-2 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
            <span className="text-xs font-bold text-indigo-900/40 uppercase tracking-widest">Pricing</span>
            <span className="font-display font-bold text-indigo-700 text-sm">KES {parseFloat(item.price).toLocaleString()}</span>
          </div>
        )}

        <div className="flex gap-3">
          {onRestock && (
            <button
              onClick={onRestock}
              className="flex-1 px-4 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-soft hover:shadow-card active:scale-[0.97] transition-all text-[11px] font-bold uppercase tracking-widest"
            >
              Add stock
            </button>
          )}
          <button
            onClick={onViewLogs}
            className="px-4 py-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-white hover:text-indigo-600 border border-transparent hover:border-indigo-100 transition-all active:scale-[0.97] group/btn"
            aria-label="View history"
          >
            <svg className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
      </div>

      {(item.is_low_stock || (expiryInfo && (expiryInfo.type === 'expired' || expiryInfo.type === 'soon'))) && (
        <div className="mt-5 space-y-2">
          {item.is_low_stock && (
            <div className={`p-2.5 rounded-xl text-[10px] font-bold text-center border shadow-sm ${item.stock_quantity === 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              <span className="flex items-center justify-center gap-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-7h2v5h-2V9z" /></svg>
                {item.stock_quantity === 0 ? 'Out of stock' : 'Low stock – add more'}
              </span>
            </div>
          )}
          {expiryInfo && (expiryInfo.type === 'expired' || expiryInfo.type === 'soon') && (
            <div className={`p-2.5 rounded-xl text-[10px] font-bold text-center border shadow-sm ${expiryInfo.type === 'expired' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              <span className="flex items-center justify-center gap-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {expiryInfo.type === 'expired' ? '⚠ Expired — do not dispense this medicine' : `⚠ Expiring in ${expiryInfo.days} day${expiryInfo.days === 1 ? '' : 's'} — use or replace soon`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryItemCard;
