import React, { useState, useEffect } from 'react';
import inventoryService from '../../services/inventoryService';
import SupplierProfileModal from '../../components/SupplierProfileModal';
import { MagnifyingGlassIcon, TruckIcon, CurrencyDollarIcon, FunnelIcon, PlusIcon } from '@heroicons/react/24/outline';

const SupplierList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [filterDebt, setFilterDebt] = useState('all'); // 'all', 'debt', 'cleared'
  
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  // Create/Edit Supplier Form State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({ name: '', contact_person: '', email: '', phone: '', address: '' });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getSuppliers();
      setSuppliers(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter(s => {
    const term = search.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(term) || 
                          (s.email && s.email.toLowerCase().includes(term)) ||
                          (s.phone && s.phone.includes(term));
    
    let matchesDebt = true;
    const bal = parseFloat(s.balance);
    if (filterDebt === 'debt') matchesDebt = bal > 0;
    if (filterDebt === 'cleared') matchesDebt = bal <= 0;

    return matchesSearch && matchesDebt;
  });

  const totalDebt = suppliers.reduce((sum, s) => {
    const bal = parseFloat(s.balance);
    return bal > 0 ? sum + bal : sum;
  }, 0);

  const totalCredit = suppliers.reduce((sum, s) => {
    const bal = parseFloat(s.balance);
    return bal < 0 ? sum + Math.abs(bal) : sum;
  }, 0);

  // Form Handlers
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await inventoryService.updateSupplier(editingSupplier.id, formData);
      } else {
        await inventoryService.createSupplier(formData);
      }
      setIsFormModalOpen(false);
      setEditingSupplier(null);
      setFormData({ name: '', contact_person: '', email: '', phone: '', address: '' });
      fetchSuppliers();
      
      // If we were editing while profile modal was open, refresh the selected supplier data
      if (selectedSupplier && editingSupplier && selectedSupplier.id === editingSupplier.id) {
          setSelectedSupplier({...selectedSupplier, ...formData});
      }
    } catch (err) {
      alert('Failed to save supplier');
      console.error(err);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || ''
    });
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier? This may fail if they have linked transactions.')) {
      try {
        await inventoryService.deleteSupplier(id);
        fetchSuppliers();
        if (selectedSupplier && selectedSupplier.id === id) {
          setSelectedSupplier(null);
        }
      } catch (err) {
        alert('Failed to delete supplier');
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <TruckIcon className="w-8 h-8 text-primary" />
            Suppliers & Accounts Payable
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Manage distributors, view payables ledger, and record credit payments.</p>
        </div>
        <button
          onClick={() => {
              setEditingSupplier(null);
              setFormData({ name: '', contact_person: '', email: '', phone: '', address: '' });
              setIsFormModalOpen(true);
          }}
          className="btn-primary px-5 py-2.5 rounded-xl font-bold text-sm shadow-premium flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" /> New Supplier
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-3xl p-6 shadow-premium border border-white/60">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <TruckIcon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Suppliers</p>
          </div>
          <p className="text-3xl font-display font-bold text-slate-900">{suppliers.length}</p>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-premium border border-rose-100 bg-gradient-to-br from-rose-50/50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Total Payables (AP)</p>
          </div>
          <p className="text-3xl font-display font-bold text-rose-600">KES {totalDebt.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-premium border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Supplier Credit</p>
          </div>
          <p className="text-3xl font-display font-bold text-emerald-600">KES {totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card rounded-[2rem] border border-white/60 shadow-sm p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search suppliers by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
          />
        </div>
        <div className="relative w-full md:w-64">
          <FunnelIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={filterDebt}
            onChange={(e) => setFilterDebt(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none appearance-none"
          >
            <option value="all">All Suppliers</option>
            <option value="debt">With Outstanding Balance</option>
            <option value="cleared">Cleared / Overpaid</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center font-semibold">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSuppliers.map(supplier => {
            const bal = parseFloat(supplier.balance);
            const isDebt = bal > 0;
            const isCredit = bal < 0;

            return (
              <button 
                key={supplier.id}
                onClick={() => setSelectedSupplier(supplier)}
                className="text-left group relative glass-card rounded-3xl p-6 border border-white/60 shadow-sm hover:shadow-premium hover:border-primary/20 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-display font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                    {supplier.name[0]?.toUpperCase()}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    isDebt ? 'bg-rose-100 text-rose-600' :
                    isCredit ? 'bg-emerald-100 text-emerald-600' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {isDebt ? 'Owed' : isCredit ? 'Credit' : 'Cleared'}
                  </div>
                </div>
                
                <h3 className="font-display font-bold text-slate-900 text-lg mb-1 truncate">{supplier.name}</h3>
                <p className="text-xs text-slate-500 font-medium mb-4 flex items-center gap-1.5 truncate">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {supplier.phone || 'No phone'}
                </p>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Balance</p>
                  <p className={`font-display font-bold text-xl ${
                    isDebt ? 'text-rose-600' :
                    isCredit ? 'text-emerald-600' :
                    'text-slate-900'
                  }`}>
                    KES {Math.abs(bal).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </p>
                </div>
              </button>
            )
          })}
          
          {filteredSuppliers.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <TruckIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No suppliers found.</p>
            </div>
          )}
        </div>
      )}

      {selectedSupplier && (
        <SupplierProfileModal
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onRefresh={() => fetchSuppliers()}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Legacy Form Modal for Add/Edit */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-[60] flex items-center justify-center animate-fade-in p-4">
            <div className="relative bg-white rounded-3xl shadow-premium max-w-md w-full mx-4 animate-scale-up">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-display font-bold text-slate-900">
                            {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                        </h3>
                        <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Name *</label>
                            <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-semibold text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Contact Person</label>
                            <input type="text" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-semibold text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-semibold text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Phone</label>
                            <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-semibold text-slate-800" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Address</label>
                            <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-semibold text-slate-800" rows="3" />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                            <button type="submit" className="px-5 py-2.5 btn-primary text-white rounded-xl font-bold shadow-md transition-all">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SupplierList;
