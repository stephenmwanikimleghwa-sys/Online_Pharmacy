import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  CurrencyDollarIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { useNotification } from '../context/NotificationContext';

// ─── helpers ───────────────────────────────────────────────────────────────

const fmt = (val) =>
  val !== null && val !== undefined && !isNaN(Number(val))
    ? `KSh ${Number(val).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

// ─── Inline edit cell ───────────────────────────────────────────────────────

const EditableCell = ({ value, onSave, saving }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    setDraft(value !== null && value !== undefined ? String(value) : '');
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const commit = async () => {
    const num = parseFloat(draft);
    if (isNaN(num) || num <= 0) return;
    await onSave(num);
    setEditing(false);
  };

  const onKey = (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') cancel();
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          autoFocus
          type="number"
          step="0.01"
          min="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          style={{
            width: 110,
            padding: '4px 10px',
            borderRadius: 10,
            border: '1.5px solid var(--color-primary)',
            fontSize: '0.82rem',
            fontWeight: 700,
            background: 'var(--bg-field)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        <button
          onClick={commit}
          disabled={saving}
          title="Save"
          style={{
            width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(16,185,129,0.12)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <CheckIcon style={{ width: 14, height: 14 }} />
        </button>
        <button
          onClick={cancel}
          title="Cancel"
          style={{
            width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(244,63,94,0.08)', color: '#f43f5e', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <XMarkIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={startEdit}>
      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
        {value ? fmt(value) : <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: 500 }}>Not set</span>}
      </span>
      <PencilSquareIcon
        style={{ width: 13, height: 13, color: 'var(--color-primary)', opacity: 0.6, flexShrink: 0 }}
      />
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const PricingManagement = () => {
  const { notify } = useNotification();
  const [products, setProducts] = useState([]);
  const [tiers, setTiers] = useState({});       // { productId: tierObj }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);   // productId being saved
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterMissing, setFilterMissing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unpricedCount, setUnpricedCount] = useState(0);
  const PER_PAGE = 25;

  // ── fetch data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page: currentPage, page_size: PER_PAGE };
      if (search) params.search = search;

      const [productsRes, tiersRes] = await Promise.all([
        api.get('/products/', { params }),
        api.get('/products/pricing-tiers/', { params: { page_size: 5000, is_active: true } }),
      ]);

      const productList =
        productsRes.data?.results ?? (Array.isArray(productsRes.data) ? productsRes.data : []);
      // Attempt to fetch global pricing summary (total/priced/unpriced)
      try {
        const summaryRes = await api.get('/products/pricing-summary/');
        const summary = summaryRes.data?.data ?? summaryRes.data;
        setTotalCount(summary.total_products ?? (productsRes.data?.count ?? productList.length));
        setUnpricedCount(summary.unpriced_count ?? 0);
      } catch (err) {
        // Fallback to page-local count when summary endpoint is unavailable
        setTotalCount(productsRes.data?.count ?? productList.length);
        setUnpricedCount(0);
      }
      setProducts(productList);

      // index tiers by product id
      const tierList =
        tiersRes.data?.results ?? (Array.isArray(tiersRes.data) ? tiersRes.data : []);
      const tierMap = {};
      tierList.forEach((t) => { tierMap[t.product_id ?? t.product] = t; });
      setTiers(tierMap);
    } catch (err) {
      console.error(err);
      setError('Failed to load pricing data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── debounce search ───────────────────────────────────────────
  const [searchDebounce, setSearchDebounce] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchDebounce); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchDebounce]);

  // ── save buying price ─────────────────────────────────────────
  const saveBuyingPrice = async (product, newBP) => {
    setSaving(product.id);
    try {
      const res = await api.post('/products/pricing-tiers/create_for_product/', {
        product_id: product.id,
        buying_price: newBP,
      });
      const updated = res.data?.data ?? res.data;
      setTiers((prev) => ({ ...prev, [product.id]: updated }));
      notify.success('Product Updated', `Changes to ${product.name} have been saved.`);
    } catch (err) {
      console.error(err);
      notify.error('Save Failed', 'Pricing could not be saved. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  // ── computed ─────────────────────────────────────────────────
  const displayed = filterMissing
    ? products.filter((p) => !tiers[p.id])
    : products;

  // Use global unpriced count for the header badge; fall back to local page missing if unavailable
  const missingCount = unpricedCount || products.filter((p) => !tiers[p.id]).length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  // ── migrate legacy prices ─────────────────────────────────────
  const [migrating, setMigrating] = useState(false);
  const migrateLegacyPrices = async () => {
    if (!window.confirm(
      `This will auto-calculate Buying Price from existing product prices for all ${missingCount} unpriced products.\n\n` +
      `Formula: BP = Current Price ÷ 1.33\n\nContinue?`
    )) return;
    setMigrating(true);
    try {
      const res = await api.post('/products/pricing-tiers/migrate_legacy_prices/');
      const result = res.data?.data ?? res.data;
      notify.success('Migration Complete', `${result.migrated_count ?? 0} products updated.`);
      fetchData();
    } catch (err) {
      console.error(err);
      notify.error('Migration Failed', 'Could not migrate prices. Please try again.');
    } finally {
      setMigrating(false);
    }
  };

  // ─── render ──────────────────────────────────────────────────

  return (
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in"
      style={{ fontFamily: 'var(--font-sans, Inter, sans-serif)' }}
    >
      {/* ── Header ── */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--gradient-primary, linear-gradient(135deg,#6366f1,#8b5cf6))', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
            >
              <TagIcon style={{ width: 22, height: 22, color: '#fff' }} />
            </div>
            <h1
              className="text-4xl font-display font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Pricing <span style={{ color: 'var(--color-primary)' }}>Management</span>
            </h1>
          </div>
          <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
            Set the buying price (BP) for each product — wholesale (WP) and retail (RP) prices are calculated automatically.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {missingCount > 0 && (
            <button
              onClick={migrateLegacyPrices}
              disabled={migrating || loading}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl border font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
              style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)', color: '#b45309', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              title="Auto-generate pricing tiers from existing product prices"
            >
              <ExclamationTriangleIcon style={{ width: 16, height: 16 }} className={migrating ? 'animate-pulse' : ''} />
              {migrating ? 'Migrating…' : `Fix ${missingCount} Unpriced`}
            </button>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl border font-bold text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <ArrowPathIcon style={{ width: 16, height: 16 }} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Pricing Formula Banner ── */}
      <div
        className="mb-8 rounded-2xl p-5 flex flex-wrap gap-6 items-center"
        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CurrencyDollarIcon style={{ width: 20, height: 20, color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>Pricing Formula</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>WP = BP × 1.15 &nbsp;|&nbsp; RP = BP × 1.33</p>
          </div>
        </div>
        {/* Summary chips */}
        <div className="flex gap-3 ml-auto">
          <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', minWidth: 90 }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Total</p>
            <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalCount}</p>
          </div>
          <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', minWidth: 90 }}>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#059669' }}>Priced</p>
            <p className="text-xl font-bold" style={{ color: '#059669' }}>{totalCount - missingCount}</p>
          </div>
          <div
            className="px-4 py-2 rounded-xl text-center cursor-pointer transition-all"
            style={{ background: missingCount > 0 ? 'rgba(245,158,11,0.08)' : 'var(--bg-card)', border: `1px solid ${missingCount > 0 ? 'rgba(245,158,11,0.25)' : 'var(--border-primary)'}`, minWidth: 90 }}
            onClick={() => { setFilterMissing((f) => !f); setCurrentPage(1); }}
            title="Click to filter products missing a pricing tier"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: missingCount > 0 ? '#b45309' : 'var(--text-secondary)' }}>Missing</p>
            <p className="text-xl font-bold" style={{ color: missingCount > 0 ? '#b45309' : 'var(--text-primary)' }}>{missingCount}</p>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl flex items-center gap-4 animate-shake"
          style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
          <ExclamationTriangleIcon style={{ width: 20, height: 20, color: '#f43f5e', flexShrink: 0 }} />
          <p className="font-bold text-sm" style={{ color: '#be123c' }}>{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>
        </div>
      )}

      {/* ── Search & Filter Bar ── */}
      <div
        className="mb-6 flex flex-wrap gap-4 p-5 rounded-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      >
        <div className="flex-1 min-w-[200px] relative">
          <MagnifyingGlassIcon
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-secondary)' }}
          />
          <input
            type="text"
            placeholder="Search products by name, category, supplier…"
            value={searchDebounce}
            onChange={(e) => setSearchDebounce(e.target.value)}
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9,
              borderRadius: 12, border: '1.5px solid var(--border-primary)', fontSize: '0.85rem',
              background: 'var(--bg-field)', color: 'var(--text-primary)', outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-primary)')}
          />
        </div>
        <label
          className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border font-semibold text-sm transition-all select-none"
          style={{
            background: filterMissing ? 'rgba(245,158,11,0.1)' : 'var(--bg-field)',
            borderColor: filterMissing ? 'rgba(245,158,11,0.35)' : 'var(--border-primary)',
            color: filterMissing ? '#b45309' : 'var(--text-secondary)',
          }}
        >
          <input
            type="checkbox"
            checked={filterMissing}
            onChange={(e) => { setFilterMissing(e.target.checked); setCurrentPage(1); }}
            style={{ display: 'none' }}
          />
          <ExclamationTriangleIcon style={{ width: 15, height: 15 }} />
          Show unpriced only
        </label>
      </div>

      {/* ── Table ── */}
      <div
        className="glass-card rounded-[2rem] overflow-hidden"
        style={{ border: '1px solid var(--border-primary)' }}
      >
        {/* Table header label */}
        <div
          className="px-8 py-5 flex items-center gap-3"
          style={{ background: 'var(--bg-field)', borderBottom: '1px solid var(--border-primary)' }}
        >
          <TagIcon style={{ width: 18, height: 18, color: 'var(--color-primary)' }} />
          <h2 className="text-base font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            {filterMissing ? 'Products Missing Pricing' : 'All Products — Pricing Overview'}
          </h2>
          <span
            className="ml-auto text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
          >
            {displayed.length} shown
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'var(--bg-field)' }}>
                {['#', 'Product', 'Category', 'Buying Price (BP)', 'Wholesale Price (WP)', 'Retail Price (RP)', 'Status'].map((h) => (
                  <th
                    key={h}
                    className="px-7 py-4 text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-primary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-7 py-5">
                        <div
                          className="animate-pulse rounded-lg"
                          style={{ height: 14, width: j === 1 ? 160 : 80, background: 'var(--bg-field)' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-7 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <TagIcon style={{ width: 40, height: 40, color: 'var(--text-secondary)' }} />
                      <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {filterMissing ? 'All products have pricing set! 🎉' : 'No products found.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((product, idx) => {
                  const tier = tiers[product.id];
                  const hasTier = Boolean(tier);
                  const isSaving = saving === product.id;

                  return (
                    <tr
                      key={product.id}
                      style={{ borderBottom: '1px solid var(--border-primary)', transition: 'background 0.12s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--brand-mist, rgba(99,102,241,0.04))')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* # */}
                      <td className="px-7 py-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {(currentPage - 1) * PER_PAGE + idx + 1}
                      </td>

                      {/* Product name */}
                      <td className="px-7 py-5">
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
                          {product.strength && (
                            <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {product.dosage_form} · {product.strength}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-7 py-5">
                        <span
                          className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                          style={{ background: 'var(--bg-field)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}
                        >
                          {product.category || '—'}
                        </span>
                      </td>

                      {/* Buying Price — editable */}
                      <td className="px-7 py-5">
                        <EditableCell
                          value={tier?.buying_price ?? null}
                          saving={isSaving}
                          onSave={(val) => saveBuyingPrice(product, val)}
                        />
                        {isSaving && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-widest animate-pulse" style={{ color: 'var(--color-primary)' }}>
                            Saving…
                          </span>
                        )}
                      </td>

                      {/* WP */}
                      <td className="px-7 py-5">
                        <span
                          className="font-bold text-sm"
                          style={{ color: hasTier ? '#059669' : 'var(--text-secondary)', fontStyle: hasTier ? 'normal' : 'italic' }}
                        >
                          {hasTier ? fmt(tier.wholesale_price) : '—'}
                        </span>
                      </td>

                      {/* RP */}
                      <td className="px-7 py-5">
                        <span
                          className="font-bold text-sm"
                          style={{ color: hasTier ? 'var(--color-primary)' : 'var(--text-secondary)', fontStyle: hasTier ? 'normal' : 'italic' }}
                        >
                          {hasTier ? fmt(tier.retail_price) : '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-7 py-5">
                        {hasTier ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border"
                            style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', borderColor: 'rgba(16,185,129,0.2)' }}
                          >
                            <CheckCircleIcon style={{ width: 12, height: 12 }} />
                            Priced
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border"
                            style={{ background: 'rgba(245,158,11,0.08)', color: '#b45309', borderColor: 'rgba(245,158,11,0.2)' }}
                          >
                            <ExclamationTriangleIcon style={{ width: 12, height: 12 }} />
                            Missing
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div
          className="px-8 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-primary)', background: 'var(--bg-field)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Showing{' '}
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
              {Math.min((currentPage - 1) * PER_PAGE + 1, totalCount)}
            </span>
            –
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
              {Math.min(currentPage * PER_PAGE, totalCount)}
            </span>{' '}
            of{' '}
            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
              {totalCount}
            </span>{' '}
            products
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
              className="px-5 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              Previous
            </button>
            <span className="text-sm font-bold px-3" style={{ color: 'var(--text-secondary)' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
              className="px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-40 btn-primary text-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PricingManagement;
