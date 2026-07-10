import React, { Suspense, lazy, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { notifyApiError } from '../utils/notifyApiError';
import { useAuth } from '../context/AuthContext';
import { useInventoryList } from '../hooks/useProducts';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import RefreshIndicator from '../components/ui/RefreshIndicator';
import inventoryService from '../services/inventoryService';
import InventoryItemCardSkeleton from '../components/InventoryItemCardSkeleton';
import ManageItemModal from '../components/ManageItemModal';
import StockLogsModal from '../components/StockLogsModal';
import BranchTypeBanner from '../components/BranchTypeBanner';
import { queryClient } from '../lib/queryClient';
import { QUERY_KEYS } from '../lib/queryKeys';
const SupplierList = lazy(() => import('./inventory/SupplierList'));
const BatchList = lazy(() => import('./inventory/BatchList'));
const StockIntakeLog = lazy(() => import('./StockIntakeLog'));
const BranchTransfers = lazy(() => import('./inventory/BranchTransfers'));

const InventoryManagement = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  useDocumentTitle('Inventory Management');
  const [activeTab, setActiveTab] = useState('inventory');
  const { activeBranch } = useAuth();
  const {
    data: inventoryData,
    isLoading: loading,
    isFetching,
    error: inventoryError,
    refetch: refetchInventory,
  } = useInventoryList();
  const inventory = inventoryData?.products ?? [];
  const totalInventoryItems = inventoryData?.totalItems ?? inventory.length;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const BRANCH_COLUMNS = ['Transcounty Main', 'Transcounty Annex', 'Peakfarm'];

  const searchInputRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['inventory', 'suppliers', 'batches', 'intake', 'transfers'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (inventoryError) {
      notify.error('Could Not Load Inventory', 'Inventory data could not be loaded. Please try again.');
    }
  }, [inventoryError, notify]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  /** Update a single item in the RQ cache without triggering a full refetch. */
  const patchCachedItem = useCallback((updatedItem) => {
    const params = { per_page: 5000 };
    const queryKey = QUERY_KEYS.inventory(activeBranch?.id, params);
    queryClient.setQueryData(queryKey, (old) => {
      if (!old) return old;
      const products = old.products.map((p) =>
        p.id === updatedItem.id ? { ...p, ...updatedItem } : p
      );
      return { ...old, products };
    });
    // Kick off a background refetch so fresh data arrives silently
    void refetchInventory();
  }, [activeBranch?.id, refetchInventory]);

  const handleRestock = async (itemId, quantity, reason, branchId, options = {}) => {
    try {
      await inventoryService.restockInventory(itemId, quantity, reason, branchId, options);
      notify.success('Stock Updated', 'Inventory levels have been updated for this product.');
      // Update the specific item's stock in-cache instantly
      patchCachedItem({ id: itemId, _restocked: true });
    } catch (error) {
      notifyApiError(notify, error, 'Restock Failed', 'Could not update stock for this item.');
    }
  };

  const handleViewLogs = (item) => {
    setSelectedItem(item);
    setShowLogsModal(true);
  };

  const inventoryMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let lowStockCount = 0;
    const expired = [];
    const expiringSoon = [];

    const withDerived = inventory.map((item) => {
      if (item.is_low_stock && item.stock_quantity > 0) lowStockCount += 1;

      let daysLeft = null;
      if (item.expiry_date) {
        const exp = new Date(item.expiry_date);
        exp.setHours(0, 0, 0, 0);
        daysLeft = Math.ceil((exp - today) / (24 * 60 * 60 * 1000));
        if (daysLeft < 0) expired.push(item);
        else if (daysLeft <= 30) expiringSoon.push({ ...item, _daysLeft: daysLeft });
      }

      return { ...item, _daysLeft: daysLeft };
    });

    return { withDerived, lowStockCount, expired, expiringSoon };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const loweredSearch = debouncedSearchTerm.toLowerCase();
    return inventoryMetrics.withDerived.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const matchesSearch = name.includes(loweredSearch);
      const matchesFilter =
        filter === 'all' ? true :
          filter === 'low' ? (item.is_low_stock && item.stock_quantity > 0) :
            filter === 'out' ? (item.stock_quantity === 0) :
              filter === 'expiring' ? (item.expiry_status === 'expiring_soon' || item.expiry_status === 'near_expiry') : true;
      return matchesSearch && matchesFilter;
    });
  }, [inventoryMetrics.withDerived, debouncedSearchTerm, filter]);

  const getBranchQty = (item, branchName) => {
    if (!branchName) return 0;
    const normalizedTarget = branchName.toUpperCase().replace(/\s+/g, '_');
    const match = (item.branch_stocks || []).find((b) => {
      if (!b || !b.branch_name) return false;
      return b.branch_name.toUpperCase().replace(/\s+/g, '_') === normalizedTarget;
    });
    return match ? Number(match.quantity || 0) : 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header Section */}
      <div className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <h1 className="text-5xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Stock <span className="text-primary">management</span>
            </h1>
            <RefreshIndicator isLoading={loading} isFetching={isFetching} />
            {user?.pharmacy_name && (
              <span className="brand-mist text-[10px] font-bold px-4 py-2 rounded-2xl uppercase tracking-[0.2em] shadow-sm">
                {user.pharmacy_name}
              </span>
            )}
          </div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Manage your medicines, suppliers, and stock levels in one place.</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 rounded-[2rem] w-full lg:w-auto shadow-inner border backdrop-blur-md" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
          {[
            { id: 'inventory', label: 'Stock list' },
            { id: 'suppliers', label: 'Suppliers' },
            { id: 'batches', label: 'Batches' },
            { id: 'intake', label: 'Stock received' },
            { id: 'transfers', label: 'Transfers' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 lg:flex-none px-8 py-3.5 rounded-[1.5rem] text-[11px] font-bold transition-all duration-500 uppercase tracking-widest ${activeTab === tab.id
                ? 'bg-white text-primary shadow-premium transform scale-[1.02] border border-indigo-50/50'
                : 'text-muted hover:text-primary hover:bg-white/50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'suppliers' ? (
        <div className="animate-fade-in">
          <Suspense fallback={<div className="p-6"><InventoryItemCardSkeleton /></div>}>
            <SupplierList />
          </Suspense>
        </div>
      ) : activeTab === 'batches' ? (
        <div className="animate-fade-in">
          <Suspense fallback={<div className="p-6"><InventoryItemCardSkeleton /></div>}>
            <BatchList />
          </Suspense>
        </div>
      ) : activeTab === 'intake' ? (
        <div className="animate-fade-in">
          <Suspense fallback={<div className="p-6"><InventoryItemCardSkeleton /></div>}>
            <StockIntakeLog />
          </Suspense>
        </div>
      ) : activeTab === 'transfers' ? (
        <div className="animate-fade-in">
          <Suspense fallback={<div className="p-6"><InventoryItemCardSkeleton /></div>}>
            <BranchTransfers />
          </Suspense>
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Branch type context banner — only for non-admin staff */}
          {user?.role !== 'admin' && <BranchTypeBanner context="are shown in this list" />}

          {/* Filters and Search Bento Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
            <div className="lg:col-span-8 glass-card rounded-[2rem] p-8 border border-white/60 shadow-premium">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Search */}
                <div className="relative group">
                  <label className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
                    <span>Search</span>
                    <span className="hidden md:inline-block bg-field border border-border text-muted px-2 py-0.5 rounded text-[9px]">Cmd K</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search by medicine name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`form-input w-full pr-6 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all font-medium placeholder:text-muted shadow-sm ${searchTerm ? 'pl-4' : 'pl-12'}`}
                    />
                    {!searchTerm && (
                      <svg className="w-5 h-5 text-muted absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    )}
                  </div>
                </div>

                {/* Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-muted uppercase tracking-[0.2em] mb-3 px-1">
                    Filter by stock
                  </label>
                  <div className="relative">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="form-input w-full pl-6 pr-12 py-4 rounded-2xl focus:outline-none focus:ring-4 transition-all font-bold appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="all">All items</option>
                      <option value="low">Low stock</option>
                      <option value="out">Out of stock</option>
                      <option value="expiring">Expiring soon</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-muted">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="lg:col-span-4 glass-card rounded-[2rem] p-8 border border-white/60 shadow-premium relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/20 transition-colors duration-700"></div>
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-6 relative z-10">Summary</h3>
              <div className="space-y-4 relative z-10">
                {/* Visual health bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-muted mb-1">
                    <span>Stock Health</span>
                    <span>{inventory.length > 0 ? Math.round(((inventory.length - inventoryMetrics.lowStockCount) / inventory.length) * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" 
                      style={{ width: `${inventory.length > 0 ? Math.round(((inventory.length - inventoryMetrics.lowStockCount) / inventory.length) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-field border border-border hover:bg-white/50 transition-all group/stat">
                  <span className="text-muted text-xs font-bold uppercase tracking-widest">Total items</span>
                  <span className="font-display font-bold text-2xl group-hover:scale-110 transition-transform" style={{ color: 'var(--text-primary)' }}>{totalInventoryItems}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all group/stat">
                  <span className="text-rose-600 text-xs font-bold uppercase tracking-widest">Need restock</span>
                  <span className="font-display font-bold text-2xl text-rose-600 group-hover:scale-110 transition-transform">
                    {inventoryMetrics.lowStockCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Expiring medicines alert */}
          {(() => {
            const { expired, expiringSoon } = inventoryMetrics;
            if (expired.length === 0 && expiringSoon.length === 0) return null;
            return (
              <div className="mb-10 space-y-4">
                {expired.length > 0 && (
                  <div className="p-6 rounded-2xl alert-error border-2 border-rose-300">
                    <h3 className="text-lg font-display font-bold text-rose-800 mb-1 flex items-center gap-2">
                      <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      ⚠ Expired Medicines ({expired.length} {expired.length === 1 ? 'item' : 'items'})
                    </h3>
                    <p className="text-sm text-rose-700 mb-4 font-medium">These medicines have passed their expiry date. <strong>Do not dispense them.</strong> Remove them from active stock immediately.</p>
                    <div className="flex flex-wrap gap-2">
                      {expired.slice(0, 12).map(item => (
                        <span key={item.id} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-rose-200 text-rose-800">
                          {item.name} — EXPIRED
                        </span>
                      ))}
                      {expired.length > 12 && <span className="px-3 py-1.5 text-rose-700 text-xs font-bold">+{expired.length - 12} more</span>}
                    </div>
                  </div>
                )}
                {expiringSoon.length > 0 && (
                  <div className="p-6 rounded-2xl border-2" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
                    <h3 className="text-lg font-display font-bold text-amber-900 mb-1 flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Expiring Soon ({expiringSoon.length} {expiringSoon.length === 1 ? 'item' : 'items'})
                    </h3>
                    <p className="text-sm text-amber-800 mb-4 font-medium">These medicines expire within 30 days. Use or replace them before they expire.</p>
                    <div className="flex flex-wrap gap-2">
                      {expiringSoon.slice(0, 12).map(item => {
                        const days = item._daysLeft;
                        return (
                          <span key={item.id} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-amber-200 text-amber-900">
                            {item.name}: {days === 0 ? 'Expires today' : `${days} day${days === 1 ? '' : 's'} left`}
                          </span>
                        );
                      })}
                      {expiringSoon.length > 12 && <span className="px-3 py-1.5 text-amber-700 text-xs font-bold">+{expiringSoon.length - 12} more</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Inventory List Layout */}
          <div className="flex items-center justify-between mb-8 px-4">
            <h2 className="text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Your stock</h2>
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Showing <span className="text-slate-900">{filteredInventory.length} items</span>
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-primary)' }}>
            {loading ? (
              <div className="p-6 grid grid-cols-1 gap-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <InventoryItemCardSkeleton key={idx} />
                ))}
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center text-center px-10 relative overflow-hidden group transition-all duration-500 hover:shadow-glow">
                <div className="absolute inset-0 bg-primary-500/5 blur-[100px] rounded-full group-hover:bg-primary-500/10 transition-colors duration-700"></div>
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900/50 rounded-3xl flex items-center justify-center mb-6 shadow-inner relative z-10 border border-white/50 dark:border-white/5">
                  <svg className="w-12 h-12 text-slate-400 dark:text-primary-500 group-hover:scale-110 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight relative z-10">No items found</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm relative z-10">We couldn't find any medicine matching your criteria. Try adjusting your filters or search.</p>
                <div className="flex gap-4 mt-8 relative z-10">
                  <button
                    onClick={() => { setSearchTerm(''); setFilter('all'); }}
                    className="form-cancel-btn px-6 py-3 font-bold text-xs rounded-xl uppercase tracking-widest transition-all"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => searchInputRef.current?.focus()}
                    className="px-6 py-3 btn-primary dark:bg-primary-600 text-white font-bold text-xs rounded-xl border border-indigo-500 dark:border-primary-500 uppercase tracking-widest hover:btn-primary dark:hover:bg-primary-500 shadow-sm dark:shadow-glow transition-all"
                  >
                    Search Again
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-auto max-h-[70vh]">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 z-20" style={{ background: 'var(--bg-primary)' }}>
                    <tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                      <th className="text-left px-3 py-3 font-bold sticky left-0 z-30" style={{ background: 'var(--bg-primary)' }}>Product</th>
                      <th className="text-left px-3 py-3 font-bold text-xs">Category</th>
                      <th className="text-left px-3 py-3 font-bold text-xs">Dept</th>
                      <th className="text-right px-3 py-3 font-bold text-xs">BP</th>
                      <th className="text-right px-3 py-3 font-bold text-xs">SP</th>
                      <th className="text-right px-3 py-3 font-bold text-xs">WP</th>
                      <th className="text-right px-3 py-3 font-bold text-xs">MAIN</th>
                      <th className="text-right px-3 py-3 font-bold text-xs">ANNEX</th>
                      <th className="text-right px-3 py-3 font-bold text-xs">PEAK</th>
                      <th className="text-right px-3 py-3 font-bold text-xs">Total</th>
                      <th className="text-left px-3 py-3 font-bold text-xs">Status</th>
                      <th className="text-right px-3 py-3 font-bold text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((item) => {
                      const main = getBranchQty(item, BRANCH_COLUMNS[0]);
                      const annex = getBranchQty(item, BRANCH_COLUMNS[1]);
                      const peakfarm = getBranchQty(item, BRANCH_COLUMNS[2]);
                      const total = main + annex + peakfarm;
                      const out = total <= 0;
                      const low = !out && item.is_low_stock;
                      const expSoon = item.expiry_status === 'expiring_soon' || item.expiry_status === 'near_expiry';
                      return (
                        <tr key={item.id} className="border-b hover:bg-primary/5 transition-colors group" style={{ borderColor: 'var(--border-primary)' }}>
                          <td className={`px-3 py-3 font-semibold text-sm sticky left-0 z-10 group-hover:bg-primary/5 transition-colors ${out ? 'text-slate-400' : ''}`} style={{ background: 'var(--bg-primary)' }}>
                            {item.name}
                          </td>
                          <td className="px-3 py-3 text-xs text-slate-600 max-w-[10rem] truncate">
                            {item.category || '—'}
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold">
                            <span className={`px-2 py-1 rounded-md text-white text-[10px] font-bold ${item.department === 'CHEMIST' ? 'bg-blue-600' : item.department === 'AGROVET' ? 'bg-green-600' : 'bg-slate-600'}`}>
                              {item.department || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                            {item.buying_price ? `${item.buying_price}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                            {item.selling_price ? `${item.selling_price}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-semibold text-slate-700">
                            {item.wholesale_price ? `${item.wholesale_price}` : '—'}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold">{main}</td>
                          <td className="px-3 py-3 text-right font-semibold">{annex}</td>
                          <td className="px-3 py-3 text-right font-semibold">{peakfarm}</td>
                          <td className="px-3 py-3 text-right font-bold">{total}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {out && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 whitespace-nowrap">Out</span>}
                              {low && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 whitespace-nowrap">Low</span>}
                              {expSoon && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 whitespace-nowrap">Exp</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex gap-1 justify-end">
                              {user?.role !== 'auditor' && (
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowManageModal(true);
                                  }}
                                  className="btn-primary px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                  </svg>
                                  Manage
                                </button>
                              )}
                              <button
                                onClick={() => handleViewLogs(item)}
                                className="px-2 py-1 rounded-lg border text-xs font-bold"
                                style={{ borderColor: 'var(--border-primary)' }}
                              >
                                Logs
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modals with Premium Styling */}
          {showManageModal && selectedItem && (
            <ManageItemModal
              item={selectedItem}
              onClose={() => {
                setShowManageModal(false);
                setSelectedItem(null);
              }}
              onRestock={handleRestock}
              onEdit={refetchInventory}
              onDelete={refetchInventory}
            />
          )}

          {showLogsModal && selectedItem && (
            <StockLogsModal
              item={selectedItem}
              onClose={() => {
                setShowLogsModal(false);
                setSelectedItem(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;
