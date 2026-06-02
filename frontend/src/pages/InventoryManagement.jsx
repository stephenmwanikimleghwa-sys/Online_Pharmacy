import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import { notifyApiError } from '../utils/notifyApiError';
import { useAuth } from '../context/AuthContext';
import inventoryService from '../services/inventoryService';
import InventoryItemCardSkeleton from '../components/InventoryItemCardSkeleton';
import RestockModal from '../components/RestockModal';
import StockLogsModal from '../components/StockLogsModal';
import SupplierList from './inventory/SupplierList';
import BatchList from './inventory/BatchList';
import StockIntakeLog from './StockIntakeLog';
import BranchTransfers from './inventory/BranchTransfers';

const InventoryManagement = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [totalInventoryItems, setTotalInventoryItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const BRANCH_COLUMNS = ['TRANSCOUNTY_MAIN', 'TRANSCOUNTY_ANNEX', 'PEAKFARM'];

  const searchInputRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['inventory', 'suppliers', 'batches', 'intake', 'transfers'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    }
  }, [activeTab]);

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

  const fetchInventory = async () => {
    try {
      if (inventory.length === 0) setLoading(true);
      const response = await inventoryService.getInventory({ per_page: 1000 });
      const data = response.data || {};
      const list = Array.isArray(data) ? data : (data.products || data.results || []);
      setInventory(Array.isArray(list) ? list : []);
      setTotalInventoryItems(data.totalItems || list.length);
    } catch (error) {
      notify.error('Could Not Load Inventory', 'Inventory data could not be loaded. Please try again.');
      setInventory([]);
      setTotalInventoryItems(0);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (itemId, quantity, reason) => {
    try {
      await inventoryService.restockInventory(itemId, quantity, reason);
      notify.success('Stock Updated', 'Inventory levels have been updated for this product.');
      fetchInventory();
    } catch (error) {
      notifyApiError(notify, error, 'Restock Failed', 'Could not update stock for this item.');
    }
  };

  const handleViewLogs = (item) => {
    setSelectedItem(item);
    setShowLogsModal(true);
  };

  const filteredInventory = inventory.filter(item => {
    const name = (item.name || '').toLowerCase();
    const matchesSearch = name.includes(debouncedSearchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true :
        filter === 'low' ? (item.is_low_stock && item.stock_quantity > 0) :
          filter === 'out' ? (item.stock_quantity === 0) :
            filter === 'expiring' ? (item.expiry_status === 'expiring_soon' || item.expiry_status === 'near_expiry') : true;
    return matchesSearch && matchesFilter;
  });

  const getBranchQty = (item, branchName) => {
    const match = (item.branch_stocks || []).find((b) => b.branch_name === branchName);
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
        <div className="animate-fade-in"><SupplierList /></div>
      ) : activeTab === 'batches' ? (
        <div className="animate-fade-in"><BatchList /></div>
      ) : activeTab === 'intake' ? (
        <div className="animate-fade-in"><StockIntakeLog /></div>
      ) : activeTab === 'transfers' ? (
        <div className="animate-fade-in"><BranchTransfers /></div>
      ) : (
        <div className="animate-fade-in">
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
                    <span>{inventory.length > 0 ? Math.round(((inventory.length - inventory.filter(i => i.is_low_stock && i.stock_quantity > 0).length) / inventory.length) * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" 
                      style={{ width: `${inventory.length > 0 ? Math.round(((inventory.length - inventory.filter(i => i.is_low_stock && i.stock_quantity > 0).length) / inventory.length) * 100) : 0}%` }}
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
                    {inventory.filter(item => item.is_low_stock && item.stock_quantity > 0).length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Expiring medicines alert */}
          {(() => {
            const getDaysLeft = (expiryDate) => {
              if (!expiryDate) return null;
              const exp = new Date(expiryDate);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              exp.setHours(0, 0, 0, 0);
              return Math.ceil((exp - today) / (24 * 60 * 60 * 1000));
            };
            const expired = inventory.filter(i => {
              const days = getDaysLeft(i.expiry_date);
              return days !== null && days < 0;
            });
            const expiringSoon = inventory.filter(i => {
              const days = getDaysLeft(i.expiry_date);
              return days !== null && days >= 0 && days <= 30;
            });
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
                        const days = getDaysLeft(item.expiry_date);
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
                  <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-card)' }}>
                    <tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                      <th className="text-left px-4 py-3 font-bold">Product</th>
                      <th className="text-right px-4 py-3 font-bold">MAIN</th>
                      <th className="text-right px-4 py-3 font-bold">ANNEX</th>
                      <th className="text-right px-4 py-3 font-bold">PEAKFARM</th>
                      <th className="text-right px-4 py-3 font-bold">Total</th>
                      <th className="text-left px-4 py-3 font-bold">Status</th>
                      <th className="text-right px-4 py-3 font-bold">Actions</th>
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
                        <tr key={item.id} className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                          <td className={`px-4 py-3 ${out ? 'text-slate-400' : ''}`}>
                            <p className="font-semibold leading-tight break-words max-w-[20rem]">{item.name}</p>
                            {item.category && <p className="text-xs text-slate-500">{item.category}</p>}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">{main}</td>
                          <td className="px-4 py-3 text-right font-semibold">{annex}</td>
                          <td className="px-4 py-3 text-right font-semibold">{peakfarm}</td>
                          <td className="px-4 py-3 text-right font-bold">{total}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {out && <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700">Out of Stock</span>}
                              {low && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700">Low Stock</span>}
                              {expSoon && <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-700">Expiring Soon</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              {user?.role !== 'auditor' && (
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowRestockModal(true);
                                  }}
                                  className="btn-primary px-3 py-1.5 rounded-lg text-xs font-bold"
                                >
                                  Restock
                                </button>
                              )}
                              <button
                                onClick={() => handleViewLogs(item)}
                                className="px-3 py-1.5 rounded-lg border text-xs font-bold"
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
          {showRestockModal && selectedItem && (
            <RestockModal
              item={selectedItem}
              onClose={() => {
                setShowRestockModal(false);
                setSelectedItem(null);
              }}
              onRestock={handleRestock}
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
