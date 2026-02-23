import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import inventoryService from '../services/inventoryService';
import InventoryItemCard from '../components/InventoryItemCard';
import RestockModal from '../components/RestockModal';
import StockLogsModal from '../components/StockLogsModal';
import SupplierList from './inventory/SupplierList';
import BatchList from './inventory/BatchList';
import StockIntakeLog from './StockIntakeLog';

const InventoryManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    }
  }, [activeTab]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventory();
      const data = response.data || {};
      const list = Array.isArray(data) ? data : (data.products || data.results || []);
      setInventory(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (itemId, quantity, reason) => {
    try {
      await inventoryService.restockInventory(itemId, quantity, reason);
      fetchInventory(); // Refresh list
    } catch (error) {
      console.error('Error restocking item:', error);
      alert('Failed to restock item');
    }
  };

  const handleViewLogs = (item) => {
    setSelectedItem(item);
    setShowLogsModal(true);
  };

  const filteredInventory = inventory.filter(item => {
    const name = (item.name || '').toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ? true :
        filter === 'low' ? (item.is_low_stock && item.stock_quantity > 0) :
          filter === 'out' ? (item.stock_quantity === 0) :
            filter === 'expiring' ? (item.expiry_status === 'expiring_soon' || item.expiry_status === 'near_expiry') : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header Section */}
      <div className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <h1 className="text-5xl font-display font-bold text-slate-900 tracking-tight">
              Stock <span className="text-indigo-600">management</span>
            </h1>
            {user?.pharmacy_name && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 uppercase tracking-[0.2em] shadow-sm">
                {user.pharmacy_name}
              </span>
            )}
          </div>
          <p className="text-lg text-slate-500 font-medium">Manage your medicines, suppliers, and stock levels in one place.</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1.5 bg-slate-100/80 rounded-[2rem] w-full lg:w-auto shadow-inner border border-slate-200/50 backdrop-blur-md">
          {[
            { id: 'inventory', label: 'Stock list' },
            { id: 'suppliers', label: 'Suppliers' },
            { id: 'batches', label: 'Batches' },
            { id: 'intake', label: 'Stock received' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 lg:flex-none px-8 py-3.5 rounded-[1.5rem] text-[11px] font-bold transition-all duration-500 uppercase tracking-widest ${activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-premium transform scale-[1.02] border border-indigo-50/50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
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
      ) : (
        <div className="animate-fade-in">
          {/* Filters and Search Bento Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
            <div className="lg:col-span-8 glass-card rounded-[2rem] p-8 border border-white/60 shadow-premium">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Search */}
                <div className="relative group">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">
                    Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by medicine name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-sm"
                    />
                    <svg className="w-5 h-5 text-slate-300 absolute left-5 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>

                {/* Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">
                    Filter by stock
                  </label>
                  <div className="relative">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="w-full pl-6 pr-12 py-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-bold text-slate-700 appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="all">All items</option>
                      <option value="low">Low stock</option>
                      <option value="out">Out of stock</option>
                      <option value="expiring">Expiring soon</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Cell */}
            <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 shadow-glow-indigo text-white flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-700"></div>
              <h3 className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-6 relative z-10">Summary</h3>
              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group/stat">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total items</span>
                  <span className="font-display font-bold text-2xl group-hover:scale-110 transition-transform">{inventory.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all group/stat">
                  <span className="text-rose-300 text-xs font-bold uppercase tracking-widest">Need restock</span>
                  <span className="font-display font-bold text-2xl text-rose-400 group-hover:scale-110 transition-transform">
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
                  <div className="p-6 rounded-2xl border-2 border-rose-300 bg-rose-50">
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
                  <div className="p-6 rounded-2xl border-2 border-amber-200 bg-amber-50">
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

          {/* Inventory Grid Layout */}
          <div className="flex items-center justify-between mb-8 px-4">
            <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Your stock</h2>
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Showing <span className="text-slate-900">{filteredInventory.length} items</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-full py-32 flex flex-col items-center justify-center space-y-6 opacity-80">
                <div className="relative">
                  <div className="w-16 h-16 border-[3px] border-indigo-100 rounded-2xl"></div>
                  <div className="w-16 h-16 border-[3px] border-indigo-600 border-t-transparent rounded-2xl animate-spin absolute top-0 left-0 shadow-glow-indigo"></div>
                </div>
                <div className="text-center">
                  <p className="text-slate-900 font-display font-bold text-xl tracking-tight">Synchronizing Registry</p>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Accessing secure pharmaceutical database...</p>
                </div>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="col-span-full py-32 glass-card rounded-[2.5rem] border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center px-10">
                <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                  <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900 tracking-tight">No items found</h3>
                <p className="text-slate-500 mt-2 max-w-sm">No items match your search or filter. Try changing the search or filter above.</p>
                <button
                  onClick={() => { setSearchTerm(''); setFilter('all'); }}
                  className="mt-8 px-6 py-2.5 bg-indigo-50 text-indigo-600 font-bold text-xs rounded-xl border border-indigo-100 uppercase tracking-widest hover:bg-indigo-100 transition-all"
                >
                  Clear search and filter
                </button>
              </div>
            ) : (
              filteredInventory.map(item => (
                <InventoryItemCard
                  key={item.id}
                  item={item}
                  onRestock={user?.role === 'auditor' ? null : () => {
                    setSelectedItem(item);
                    setShowRestockModal(true);
                  }}
                  onViewLogs={() => handleViewLogs(item)}
                />
              ))
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
