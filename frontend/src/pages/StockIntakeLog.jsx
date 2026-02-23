import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline';

const StockIntakeLog = () => {
  const { user } = useAuth();
  const [intakeRecords, setIntakeRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterDistributor, setFilterDistributor] = useState('');
  const [summary, setSummary] = useState(null);

  const [formData, setFormData] = useState({
    product: '',
    distributor_name: '',
    quantity_received: '',
    unit_cost: '',
    expiry_date: '',
    batch_number: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState({});

  const [suppliers, setSuppliers] = useState([]);

  // Fetch stock intake records
  useEffect(() => {
    fetchIntakeRecords();
    fetchProducts();
    fetchSuppliers();
    fetchSummary();
  }, [filterDistributor]);

  const fetchIntakeRecords = async () => {
    try {
      setLoading(true);
      const params = filterDistributor ? `?distributor=${filterDistributor}` : '';
      const response = await api.get(`/inventory/stock-intake/${params}`);
      setIntakeRecords(Array.isArray(response.data) ? response.data : response.data.results || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching intake records:', err);
      setError('Failed to fetch stock intake records');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/');
      setProducts(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/inventory/suppliers/');
      setSuppliers(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/inventory/stock-intake/summary/');
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.product) errors.product = 'Product is required';
    if (!formData.distributor_name) errors.distributor_name = 'Distributor name is required';
    if (!formData.quantity_received || formData.quantity_received <= 0) {
      errors.quantity_received = 'Quantity must be greater than 0';
    }
    if (!formData.unit_cost || formData.unit_cost <= 0) {
      errors.unit_cost = 'Unit cost must be greater than 0';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await api.post('/inventory/stock-intake/', {
        product: formData.product,
        distributor_name: formData.distributor_name,
        quantity_received: parseInt(formData.quantity_received),
        unit_cost: parseFloat(formData.unit_cost),
        expiry_date: formData.expiry_date || null,
        batch_number: formData.batch_number,
        notes: formData.notes,
      });

      // Reset form and refresh records
      setFormData({
        product: '',
        distributor_name: '',
        quantity_received: '',
        unit_cost: '',
        expiry_date: '',
        batch_number: '',
        notes: '',
      });
      setFormErrors({});
      setIsModalOpen(false);
      fetchIntakeRecords();
      fetchSummary();
    } catch (err) {
      console.error('Error creating intake record:', err);
      setError(err.response?.data?.detail || 'Failed to create record');
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  if (!user || (user.role !== 'admin' && user.role !== 'pharmacist')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only admins and pharmacists can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header Section */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-glow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Stock <span className="text-indigo-600">Received</span></h1>
          </div>
          <p className="text-lg text-slate-500 font-medium">Record medicines and supplies received from your suppliers.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-premium hover:shadow-glow transition-all active:scale-[0.98] flex items-center gap-2 group"
        >
          <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest leading-none mt-0.5">Record New Delivery</span>
        </button>
      </div>

      {/* Summary Cards Bento */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Records', value: summary.total_records, color: 'indigo', icon: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
            { label: 'Units Received', value: summary.total_quantity_received, color: 'emerald', icon: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
            { label: 'Total Cost', value: `KES ${parseFloat(summary.total_cost).toLocaleString()}`, color: 'violet', icon: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Suppliers Used', value: summary.distributors, color: 'amber', icon: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
          ].map((stat, i) => (
            <div key={i} className="glass-card rounded-3xl p-6 shadow-premium border border-white/60 hover:shadow-soft transition-all group">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 bg-${stat.color}-50 rounded-xl flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
              <p className="text-2xl font-display font-bold text-slate-900 truncate">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 animate-shake">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="text-rose-900 font-bold text-sm tracking-tight">{error}</p>
        </div>
      )}

      {/* Controls & Table Container */}
      <div className="glass-card rounded-[2.5rem] border border-white/60 shadow-premium overflow-hidden">
        <div className="px-8 py-8 border-b border-slate-100 bg-white/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="relative group w-full md:w-96">
            <input
              type="text"
              placeholder="Search by supplier name..."
              value={filterDistributor}
              onChange={(e) => setFilterDistributor(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-sm"
            />
            <svg className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-100 rounded-full">All Records</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                {['Medicine / Product', 'Supplier', 'Quantity', 'Unit Price', 'Total Cost', 'Expiry Date', 'Actions'].map((header) => (
                  <th key={header} className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-xl animate-spin shadow-glow-indigo"></div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : intakeRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-slate-500 font-display font-bold">No deliveries recorded yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                intakeRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{record.product_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Batch: {record.batch_number || 'ST-ALPHA'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 shadow-sm">{record.distributor_name}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-display font-bold text-slate-900">{record.quantity_received}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Units</p>
                    </td>
                    <td className="px-8 py-6 font-medium text-slate-600 text-sm">KES {parseFloat(record.unit_cost).toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <p className="font-display font-bold text-indigo-600">KES {parseFloat(record.total_cost).toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${record.expiry_date && new Date(record.expiry_date) < new Date()
                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                        {record.expiry_date ? new Date(record.expiry_date).toLocaleDateString() : 'Infinite'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-card transition-all active:scale-90"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Stock Modal - Premium Split Layout Pattern */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-premium max-w-2xl w-full overflow-hidden flex flex-col md:flex-row animate-scale-up border-[8px] border-white ring-1 ring-slate-200">
            {/* Visual Panel */}
            <div className="md:w-1/3 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div>
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-glow-indigo">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                </div>
                <h2 className="text-3xl font-display font-bold leading-tight">Record a New Delivery</h2>
                <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">Fill in the details of the medicines you received from your supplier.</p>
              </div>

            </div>

            <form onSubmit={handleSubmit} className="md:w-2/3 p-10 bg-slate-50/30 overflow-y-auto max-h-[85vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Medicine / Product</label>
                  <select
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className={`w-full px-5 py-4 bg-white border rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm appearance-none ${formErrors.product ? 'border-rose-300 ring-4 ring-rose-500/5' : 'border-slate-200'}`}
                  >
                    <option value="">Select a product...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Supplier Name</label>
                  <input
                    type="text"
                    list="distributors-list"
                    value={formData.distributor_name}
                    onChange={(e) => setFormData({ ...formData, distributor_name: e.target.value })}
                    placeholder="Search or enter distributor..."
                    className={`w-full px-5 py-4 bg-white border rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm ${formErrors.distributor_name ? 'border-rose-300 ring-4 ring-rose-500/5' : 'border-slate-200'}`}
                  />
                  <datalist id="distributors-list">
                    {suppliers.map(supplier => <option key={supplier.id} value={supplier.name} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Quantity Received</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity_received}
                    onChange={(e) => setFormData({ ...formData, quantity_received: e.target.value })}
                    className={`w-full px-5 py-4 bg-white border rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm ${formErrors.quantity_received ? 'border-rose-300 ring-4 ring-rose-500/5' : 'border-slate-200'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Price per Unit (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                    className={`w-full px-5 py-4 bg-white border rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm ${formErrors.unit_cost ? 'border-rose-300 ring-4 ring-rose-500/5' : 'border-slate-200'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Batch Number</label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    placeholder="LOT-ID-000"
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-premium hover:shadow-glow font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Detail Modal - Premium Design */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-premium max-w-lg w-full overflow-hidden animate-scale-up border-[8px] border-white ring-1 ring-slate-200">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Protocol Details</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Transaction ID: {selectedRecord.id?.toString().padStart(6, '0')}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all shadow-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-10 space-y-8 bg-white">
              <div className="flex items-start gap-4 p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-glow-indigo flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Product</p>
                  <p className="text-xl font-display font-bold text-indigo-900">{selectedRecord.product_name}</p>
                  <p className="text-xs font-bold text-indigo-600/60 mt-0.5">Supplier: {selectedRecord.distributor_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quantity Received</p>
                  <p className="text-3xl font-display font-bold text-slate-900">{selectedRecord.quantity_received} <span className="text-sm text-slate-400 font-bold">UNITS</span></p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Cost</p>
                  <p className="text-xl font-display font-bold text-indigo-600">KES {parseFloat(selectedRecord.total_cost).toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Unit Cost: {parseFloat(selectedRecord.unit_cost).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Expiry Date</p>
                  <p className="font-bold text-slate-700 px-4 py-2 bg-slate-100/50 rounded-xl text-xs">{selectedRecord.expiry_date ? new Date(selectedRecord.expiry_date).toLocaleDateString() : 'Secure/Infinite'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Batch Number</p>
                  <p className="font-bold text-slate-700 px-4 py-2 bg-slate-100/50 rounded-xl text-xs">{selectedRecord.batch_number || 'ST-DEFAULT-ALPHA'}</p>
                </div>
              </div>

              <div className="p-5 bg-indigo-900 rounded-3xl text-white flex items-center justify-between shadow-premium">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-800 flex items-center justify-center text-indigo-300 font-display font-bold text-sm">
                    {selectedRecord.received_by_username?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Recorded By</p>
                    <p className="text-xs font-bold text-white uppercase tracking-tight">{selectedRecord.received_by_username}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Timestamp</p>
                  <p className="text-[10px] font-bold text-indigo-100">{new Date(selectedRecord.received_date).toLocaleString()}</p>
                </div>
              </div>

              {selectedRecord.notes && (
                <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 text-amber-900 italic text-xs leading-relaxed">
                  <span className="font-bold uppercase tracking-widest text-[9px] block mb-1 not-italic text-amber-500">Notes:</span>
                  "{selectedRecord.notes}"
                </div>
              )}

              <button
                onClick={() => setSelectedRecord(null)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 font-bold text-xs uppercase tracking-widest transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockIntakeLog;
