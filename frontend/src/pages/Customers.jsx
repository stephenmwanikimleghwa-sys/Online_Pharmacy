import React, { useState } from 'react';
import api from '../services/api';
import CustomerProfileModal from '../components/CustomerProfileModal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { MagnifyingGlassIcon, UserGroupIcon, CurrencyDollarIcon, FunnelIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useCustomers } from '../hooks/useCustomers';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import RefreshIndicator from '../components/ui/RefreshIndicator';
import { queryClient } from '../lib/queryClient';
import { QUERY_KEYS } from '../lib/queryKeys';

const Customers = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const {
    data: customers = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useCustomers();

  useDocumentTitle('Customers & Debt');
  
  const [search, setSearch] = useState('');
  const [filterDebt, setFilterDebt] = useState('all'); // 'all', 'debt', 'cleared'
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', credit_balance: '' });

  const invalidateCustomers = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
  };

  const resetCreateForm = () => {
    setCreateError('');
    setNewCustomer({ name: '', phone: '', address: '', credit_balance: '' });
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      setCreateError('Name and phone are required.');
      return;
    }

    setCreatingCustomer(true);
    setCreateError('');

    try {
      await api.post('/auth/customers/', {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim(),
        credit_balance: newCustomer.credit_balance ? Number(newCustomer.credit_balance) : 0,
      });
      setShowCreateModal(false);
      resetCreateForm();
      invalidateCustomers();
      notify.success('Customer Added', 'New customer was added successfully.');
    } catch (err) {
      const data = err.response?.data;
      setCreateError(
        (data && typeof data === 'object' && (data.detail || data.message || JSON.stringify(data))) ||
        'Could not create customer. Please try again.'
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          (c.phone && c.phone.includes(search));
    
    let matchesDebt = true;
    const bal = parseFloat(c.credit_balance);
    if (filterDebt === 'debt') matchesDebt = bal > 0;
    if (filterDebt === 'cleared') matchesDebt = bal <= 0;

    return matchesSearch && matchesDebt;
  });

  const totalDebt = customers.reduce((sum, c) => {
    const bal = parseFloat(c.credit_balance);
    return bal > 0 ? sum + bal : sum;
  }, 0);

  const totalCredit = customers.reduce((sum, c) => {
    const bal = parseFloat(c.credit_balance);
    return bal < 0 ? sum + Math.abs(bal) : sum;
  }, 0);

  if (!user || (user.role !== 'admin' && user.role !== 'pharmacist' && user.role !== 'cashier')) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl font-bold" style={{ color: 'var(--text-secondary)' }}>Access Denied.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <UserGroupIcon className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
            Customers & Debt
            <RefreshIndicator isFetching={isFetching} isLoading={isLoading} />
          </h1>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Manage credit clients, view transaction ledgers, and process debt payments.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-3xl p-6 shadow-premium border" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <UserGroupIcon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Total Clients</p>
          </div>
          <p className="text-3xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>{customers.length}</p>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-premium border" style={{ borderColor: 'rgba(244,63,94,0.25)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-600" style={{ background: 'rgba(244,63,94,0.12)' }}>
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#e11d48' }}>Outstanding AR</p>
          </div>
          <p className="text-3xl font-display font-bold text-rose-600">KES {totalDebt.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-premium border" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600" style={{ background: 'rgba(16,185,129,0.12)' }}>
              <CurrencyDollarIcon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#059669' }}>Store Credit Owned</p>
          </div>
          <p className="text-3xl font-display font-bold text-emerald-600">KES {totalCredit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card rounded-[2rem] border border-white/60 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input w-full pl-11 pr-4 py-3 rounded-xl transition-all outline-none"
          />
        </div>
        <div className="relative w-full md:w-64">
          <FunnelIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <select
            value={filterDebt}
            onChange={(e) => setFilterDebt(e.target.value)}
            className="form-input w-full pl-11 pr-4 py-3 rounded-xl transition-all outline-none appearance-none"
          >
            <option value="all">All Customers</option>
            <option value="debt">With Outstanding Debt</option>
            <option value="cleared">Cleared / Negative</option>
          </select>
        </div>
        <div className="w-full md:w-auto">
          <button
            type="button"
            onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:bg-primary-600 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center">
          <p className="font-semibold mb-3">Failed to load customers.</p>
          <button type="button" className="btn-primary px-4 py-2 rounded-xl text-sm" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCustomers.map(customer => {
            const bal = parseFloat(customer.credit_balance);
            const isDebt = bal > 0;
            const isCredit = bal < 0;

            return (
              <button 
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className="text-left group relative glass-card rounded-3xl p-6 border shadow-sm hover:shadow-premium transition-all duration-300 hover:-translate-y-1"
                style={{ borderColor: 'var(--border-primary)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center text-white font-display font-bold text-lg shadow-glow-indigo group-hover:scale-110 transition-transform">
                    {customer.name[0]?.toUpperCase()}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    isDebt ? 'bg-rose-100 text-rose-600' :
                    isCredit ? 'bg-emerald-100 text-emerald-600' : ''
                  }`} style={!isDebt && !isCredit ? { background: 'var(--bg-field)', color: 'var(--text-secondary)' } : {}}>
                    {isDebt ? 'In Debt' : isCredit ? 'Credit' : 'Cleared'}
                  </div>
                </div>

                <h3 className="font-display font-bold text-lg mb-1 truncate" style={{ color: 'var(--text-primary)' }}>{customer.name}</h3>
                <p className="text-xs font-medium mb-4 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  {customer.phone || 'No phone'}
                </p>

                <div className="pt-4 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Balance</p>
                  <p className={`font-display font-bold text-xl ${
                    isDebt ? 'text-rose-600' :
                    isCredit ? 'text-emerald-600' : ''
                  }`} style={!isDebt && !isCredit ? { color: 'var(--text-primary)' } : {}}>
                    KES {Math.abs(bal).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </p>
                </div>
              </button>
            )
          })}
          
          {filteredCustomers.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-primary)', opacity: 0.5 }} />
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No customers found.</p>
            </div>
          )}
        </div>
      )}

      {selectedCustomer && (
        <CustomerProfileModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onRefresh={() => invalidateCustomers()}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-2xl glass-card rounded-[2rem] shadow-premium overflow-hidden border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="px-8 py-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
              <div>
                <h2 className="text-2xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Add Customer</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Create a new credit customer record.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="form-cancel-btn px-4 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-8 space-y-4">
              {createError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm">
                  {createError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Name
                  <input
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Customer name"
                    className="form-input w-full px-4 py-3 rounded-2xl"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Phone
                  <input
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="Phone number"
                    className="form-input w-full px-4 py-3 rounded-2xl"
                    required
                  />
                </label>
              </div>
              <div>
                <label className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Address
                  <textarea
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    placeholder="Customer address"
                    className="form-input w-full px-4 py-3 rounded-2xl"
                    rows={3}
                  />
                </label>
              </div>
              <div>
                <label className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Opening balance (optional)
                  <input
                    type="number"
                    step="0.01"
                    value={newCustomer.credit_balance}
                    onChange={(e) => setNewCustomer({ ...newCustomer, credit_balance: e.target.value })}
                    placeholder="0.00"
                    className="form-input w-full px-4 py-3 rounded-2xl"
                  />
                </label>
              </div>
              <div className="flex flex-col md:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="form-cancel-btn flex-1 py-3 rounded-2xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCustomer}
                  className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold uppercase tracking-widest shadow-premium hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {creatingCustomer ? 'Saving...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
