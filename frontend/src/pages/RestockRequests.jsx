import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBranchParam } from '../hooks/useBranchParam';
import { Dialog, Transition as HeadlessTransition } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-600 border-amber-100',
  approved: 'bg-indigo-50 text-primary border-indigo-100',
  rejected: 'bg-rose-50 text-rose-600 border-rose-100',
  completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  cancelled: 'bg-slate-50 text-slate-400 border-slate-200',
};

const RestockRequests = () => {
  const { activeBranch } = useAuth();
  const { branchParams } = useBranchParam();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    product: '',
    requested_quantity: '',
    supplier: '',
    notes: '',
    estimated_cost: '',
  });
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    product: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch restock requests with pagination and filters
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        ...branchParams,
        ...(filters.status && { status: filters.status }),
        ...(filters.product && { product_id: filters.product }),
      });

      const response = await api.get(`/inventory/restock-requests/?${params}`);
      setRequests(response.data.results);
      setTotalPages(Math.ceil(response.data.count / 10));
    } catch (err) {
      console.error('Failed to fetch restock requests:', err);
      setError('Failed to load restock requests');
    } finally {
      setLoading(false);
    }
  };

  // Fetch products for the select dropdown
  const fetchProducts = async () => {
    try {
      const response = await api.get('/inventory/');
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentPage, filters, activeBranch]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!formData.product) errors.product = 'Product is required';
    if (!formData.requested_quantity || formData.requested_quantity <= 0) {
      errors.requested_quantity = 'Quantity must be greater than zero';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await api.post('/inventory/restock-requests/', {
        ...formData,
        requested_quantity: parseInt(formData.requested_quantity, 10),
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      });
      setIsModalOpen(false);
      setFormData({
        product: '',
        requested_quantity: '',
        supplier: '',
        notes: '',
        estimated_cost: '',
      });
      fetchRequests();
    } catch (err) {
      console.error('Failed to create restock request:', err);
      setError('Failed to create restock request');
      if (err.response?.data) {
        setFormErrors(err.response.data);
      }
    }
  };

  const handleStatusUpdate = async (requestId, action) => {
    if (!window.confirm(`Confirm security action: ${action.toUpperCase()}?`)) return;

    try {
      await api.post(`/inventory/restock-requests/${requestId}/${action}/`);
      fetchRequests();
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      setError(`Failed to ${action} request`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header Section */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-glow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Supply <span className="text-primary">Requisitions</span></h1>
          </div>
          <p className="text-lg text-slate-500 font-medium">Coordinate procurement channels and restock logistics across the network.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3.5 btn-primary text-white rounded-2xl  shadow-premium hover:shadow-glow transition-all active:scale-[0.98] flex items-center gap-2 group"
        >
          <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest leading-none mt-0.5">Authorize Requisition</span>
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 animate-shake">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="text-rose-900 font-bold text-sm tracking-tight">{error}</p>
        </div>
      )}

      {/* Filters Bento */}
      <div className="glass-card rounded-[2rem] p-8 border border-white/60 shadow-premium mb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Protocol Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-4 /10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm appearance-none"
            >
              <option value="">Full Range View</option>
              {['pending', 'approved', 'rejected', 'completed', 'cancelled'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)} Channel</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">Asset Filter</label>
            <select
              value={filters.product}
              onChange={(e) => setFilters({ ...filters, product: e.target.value })}
              className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-4 /10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm appearance-none"
            >
              <option value="">Across Entire Inventory</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end justify-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 py-2 bg-slate-100 rounded-full border border-slate-200/50">Real-time Coordination</span>
          </div>
        </div>
      </div>

      {/* Requests Table Container */}
      <div className="glass-card rounded-[2.5rem] border border-white/60 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                {['Asset Details', 'Requested By', 'Volume', 'Status', 'Timestamp', 'Security Actions'].map((header) => (
                  <th key={header} className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-xl animate-spin shadow-glow-indigo"></div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Retrieving Requisitions...</p>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-slate-500 font-display font-bold italic">No requisitions detected in this corridor.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{request.product_details?.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{request.supplier || 'Generic Channel'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-slate-200">
                          {request.requested_by_username?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{request.requested_by_username}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-display font-bold text-slate-900">{request.requested_quantity}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Units Requested</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border shadow-sm ${STATUS_COLORS[request.status]}`}>
                        {request.status_display}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[11px] font-bold text-slate-500">{new Date(request.created_at).toLocaleDateString()}</p>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">{new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(request.id, 'approve')}
                              className="px-3 py-1.5 bg-indigo-50 text-primary rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(request.id, 'reject')}
                              className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100 shadow-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'complete')}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
                          >
                            Execute/Complete
                          </button>
                        )}
                        {['pending', 'approved'].includes(request.status) && (
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'cancel')}
                            className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
                          >
                            Void
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Section */}
        <div className="px-10 py-6 border-t flex items-center justify-between" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Protocol Page <span style={{ color: 'var(--text-primary)' }}>{currentPage}</span> of <span style={{ color: 'var(--text-primary)' }}>{totalPages}</span>
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="form-cancel-btn px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all shadow-sm active:scale-95 disabled:opacity-40"
            >
              Previous Sequence
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="form-cancel-btn px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all shadow-sm active:scale-95 disabled:opacity-40"
            >
              Next Sequence
            </button>
          </div>
        </div>
      </div>

      {/* Requisition Modal - Premium Split Layout Pattern */}
      <HeadlessTransition show={isModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center"
          onClose={() => setIsModalOpen(false)}
        >
          <HeadlessTransition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="bg-white rounded-[2.5rem] shadow-premium max-w-2xl w-full overflow-hidden flex flex-col md:flex-row border-[8px] border-white ring-1 ring-slate-200 animate-scale-up">
              {/* Visual Panel */}
              <div className="md:w-1/3 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 btn-primary/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div>
                  <div className="w-12 h-12 btn-primary rounded-2xl flex items-center justify-center mb-6 shadow-glow-indigo">
                    <PlusIcon className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-display font-bold leading-tight">Authorize Requisition</h2>
                  <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">Initialize the procurement protocol for inventory assets.</p>
                </div>
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] opacity-40">System Release 12.0</div>
              </div>

              <form onSubmit={handleSubmit} className="md:w-2/3 p-10 bg-slate-50/30">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Target Asset</label>
                    <select
                      value={formData.product}
                      onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                      className={`form-input w-full px-5 py-4 rounded-2xl focus:outline-none transition-all font-bold shadow-sm appearance-none ${formErrors.product ? 'border-rose-300 ring-4 ring-rose-500/5' : ''}`}
                    >
                      <option value="">Identify Asset...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                    </select>
                    {formErrors.product && <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2">{formErrors.product}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Protocol Volume</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.requested_quantity}
                        onChange={(e) => setFormData({ ...formData, requested_quantity: e.target.value })}
                        className={`form-input w-full px-5 py-4 rounded-2xl focus:outline-none transition-all font-bold shadow-sm ${formErrors.requested_quantity ? 'border-rose-300 ring-4 ring-rose-500/5' : ''}`}
                        placeholder="Quantity..."
                      />
                      {formErrors.requested_quantity && <p className="mt-2 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2">{formErrors.requested_quantity}</p>}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Estimated Commitment</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.estimated_cost}
                        onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                        className="form-input w-full px-5 py-4 rounded-2xl focus:outline-none transition-all font-bold shadow-sm"
                        placeholder="KES Value..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Procurement Vendor</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="form-input w-full px-5 py-4 rounded-2xl focus:outline-none transition-all font-bold shadow-sm"
                      placeholder="Supplier identity..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Strategic Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="form-input w-full px-5 py-4 rounded-2xl focus:outline-none transition-all font-medium shadow-sm"
                      placeholder="Contextual details for procurement review..."
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="form-cancel-btn flex-1 px-6 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-6 py-4 btn-primary text-white rounded-2xl  shadow-premium hover:shadow-glow font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98]"
                  >
                    Finalize Requisition
                  </button>
                </div>
              </form>
            </div>
          </HeadlessTransition.Child>
        </Dialog>
      </HeadlessTransition>
    </div>
  );
};

export default RestockRequests;