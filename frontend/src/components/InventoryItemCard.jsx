import React from 'react';
import { getProductUnitLabel } from '../utils/displayHelpers';

const InventoryItemCard = ({ item, onRestock, onViewLogs }) => {
  const getStockStatusStyle = () => {
    if (item.stock_quantity === 0) {
      return 'bg-red-50 text-red-600 border-red-100';
    } else if (item.stock_quantity <= item.reorder_threshold) {
      return 'bg-amber-50 text-amber-600 border-amber-100';
    } else {
      return '';
    }
  };

  const getStockStatusInlineStyle = () => {
    if (item.stock_quantity === 0 || item.stock_quantity <= item.reorder_threshold) return {};
    return {
      background: 'rgba(124, 58, 237, 0.08)',
      color: 'var(--color-primary)',
      borderColor: 'var(--border-primary)',
    };
  };

  const getStockStatusText = () => {
    if (item.stock_quantity === 0) return 'Out of Stock';
    if (item.stock_quantity <= item.reorder_threshold) return 'Low Stock';
    return 'In Stock';
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

  // Expiry row styling — keep semantic colors but use them meaningfully
  const getExpiryRowStyle = () => {
    if (!expiryInfo) return { background: 'var(--bg-field)', borderColor: 'var(--border-primary)' };
    if (expiryInfo.type === 'expired') return { background: 'rgba(254,202,202,0.3)', borderColor: 'rgba(252,165,165,0.4)' };
    if (expiryInfo.type === 'soon') return { background: 'rgba(254,243,199,0.3)', borderColor: 'rgba(253,224,132,0.4)' };
    if (expiryInfo.type === 'near') return { background: 'rgba(224,242,254,0.3)', borderColor: 'rgba(147,197,253,0.4)' };
    return { background: 'rgba(209,250,229,0.25)', borderColor: 'rgba(110,231,183,0.35)' };
  };

  const getExpiryLabelColor = () => {
    if (!expiryInfo) return 'var(--text-secondary)';
    if (expiryInfo.type === 'expired') return '#f87171';
    if (expiryInfo.type === 'soon') return '#f59e0b';
    if (expiryInfo.type === 'near') return '#38bdf8';
    return '#10b981';
  };

  const getExpiryTextColor = () => {
    if (!expiryInfo) return 'var(--text-secondary)';
    if (expiryInfo.type === 'expired') return '#dc2626';
    if (expiryInfo.type === 'soon') return '#b45309';
    if (expiryInfo.type === 'near') return '#0369a1';
    return '#059669';
  };

  return (
    <div className="glass-card rounded-3xl p-6 group hover:shadow-glow transition-all duration-500 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--btn-gradient)', boxShadow: '0 0 8px rgba(124,58,237,0.4)' }}></div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>
              {item.category?.replace('_', ' ')}
            </p>
          </div>
          <h3 className="text-xl font-display font-bold break-words group-hover:text-[var(--color-highlight)] transition-colors tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {item.name}
          </h3>
        </div>
        <span
          className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap shadow-sm ${getStockStatusStyle()}`}
          style={getStockStatusInlineStyle()}
        >
          {getStockStatusText()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="data-cell">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5 px-0.5" style={{ color: 'var(--text-secondary)' }}>Quantity</p>
          <div className="flex items-baseline gap-1">
            <p className={`text-3xl font-display font-bold ${item.stock_quantity === 0 ? 'text-rose-600' : item.stock_quantity <= item.reorder_threshold ? 'text-amber-500' : ''}`}
              style={item.stock_quantity > item.reorder_threshold ? { color: 'var(--text-primary)' } : {}}>
              {item.stock_quantity}
            </p>
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>{getProductUnitLabel(item, item.stock_quantity)}</span>
          </div>
        </div>
        <div className="data-cell">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5 px-0.5" style={{ color: 'var(--text-secondary)' }}>Alert when below</p>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>{item.reorder_threshold}</p>
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>min</span>
          </div>
        </div>
      </div>

      {/* Expiry info */}
      <div className="mb-4 p-3 rounded-xl border" style={getExpiryRowStyle()}>
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: getExpiryLabelColor() }}>
          Expiry date
        </p>
        {!expiryInfo ? (
          <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>No expiry date recorded</p>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold" style={{ color: getExpiryTextColor() }}>
              {new Date(item.expiry_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
              style={{
                background: expiryInfo.type === 'expired' ? 'rgba(254,202,202,0.5)' :
                  expiryInfo.type === 'soon' ? 'rgba(254,243,199,0.5)' :
                    expiryInfo.type === 'near' ? 'rgba(224,242,254,0.5)' : 'rgba(209,250,229,0.5)',
                color: getExpiryTextColor(),
              }}>
              {expiryInfo.type === 'expired' ? '⚠ EXPIRED' : `${expiryInfo.days} days left`}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        {item.price && (
          <div className="flex items-center justify-between px-2 py-2 rounded-xl border"
            style={{ background: 'var(--brand-mist)', borderColor: 'var(--brand-border-soft)' }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Pricing</span>
            <span className="font-display font-bold text-sm" style={{ color: 'var(--color-primary)' }}>KES {parseFloat(item.price).toLocaleString()}</span>
          </div>
        )}

        {(item.vat_obligation || item.shelf_location) && (
          <div className="grid grid-cols-2 gap-3">
            {item.vat_obligation && (
              <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>VAT</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.vat_obligation}</p>
              </div>
            )}
            {item.shelf_location && (
              <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Shelf</p>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.shelf_location}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {onRestock && (
            <button
              onClick={onRestock}
              className="btn-primary flex-1 px-4 py-3.5 rounded-2xl text-white active:scale-[0.97] transition-all text-[11px] font-bold uppercase tracking-widest"
            >
              Add stock
            </button>
          )}
          <button
            onClick={onViewLogs}
            className="px-4 py-3.5 rounded-2xl border active:scale-[0.97] transition-all group/btn"
            style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
            aria-label="View history"
          >
            <svg className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
