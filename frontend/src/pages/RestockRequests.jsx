import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBranchParam } from '../hooks/useBranchParam';
import { Dialog, Transition as HeadlessTransition } from '@headlessui/react';
import { PlusIcon, CheckIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  approved: 'bg-teal-50 text-teal-700 border-teal-100',
  rejected: 'bg-rose-50 text-rose-600 border-rose-100',
  completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  cancelled: 'bg-slate-50 text-slate-400 border-slate-200',
};

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  cancelled: 'Cancelled',
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
      const data = response.data;
      const results = Array.isArray(data) ? data : data?.results || [];
      setRequests(results);
      const count = Array.isArray(data) ? results.length : data?.count ?? results.length;
      if (!Array.isArray(data) && data?.next && results.length > 0) {
        setTotalPages(Math.max(1, Math.ceil(count / results.length)));
      } else {
        setTotalPages(Math.max(1, currentPage));
      }
      setError('');
    } catch (err) {
      setError('Could not load stock requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/inventory/');
      setProducts(response.data.products || []);
    } catch (err) {
      /* ignore — dropdown stays empty */
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
    if (!formData.product) errors.product = 'Choose a product';
    if (!formData.requested_quantity || formData.requested_quantity <= 0) {
      errors.requested_quantity = 'Enter how many you need';
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
      setError('Could not create the stock request.');
      if (err.response?.data) {
        setFormErrors(err.response.data);
      }
    }
  };

  const handleStatusUpdate = async (requestId, action) => {
    const labels = {
      approve: 'approve this request',
      reject: 'reject this request',
      complete: 'mark this request as received / complete',
      cancel: 'cancel this request',
    };
    if (!window.confirm(`Are you sure you want to ${labels[action] || action}?`)) return;

    try {
      await api.post(`/inventory/restock-requests/${requestId}/${action}/`);
      fetchRequests();
    } catch (err) {
      setError(`Could not ${action} this request.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-glow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Restock requests
            </h1>
          </div>
          <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
            Ask for more stock from a supplier, then approve and complete when it arrives.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3.5 btn-primary text-white rounded-2xl shadow-premium hover:shadow-glow transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="text-xs font-bold">Request stock</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4">
          <p className="text-rose-900 font-bold text-sm tracking-tight">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>
        </div>
      )}

      <div className="glass-card rounded-xl p-6 border shadow-premium mb-8" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="form-input w-full"
            >
              <option value="">All statuses</option>
              {['pending', 'approved', 'rejected', 'completed', 'cancelled'].map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>Product</label>
            <select
              value={filters.product}
              onChange={(e) => setFilters({ ...filters, product: e.target.value })}
              className="form-input w-full"
            >
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl border shadow-premium overflow-hidden" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-field)' }}>
                {['Product', 'Requested by', 'Qty', 'Status', 'Date', 'Actions'].map((header) => (
                  <th key={header} className="px-6 py-4 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Loading…
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center">
                    <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No restock requests yet.</p>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="mt-3 text-sm font-bold text-primary underline"
                    >
                      Request stock
                    </button>
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-primary)' }}>
                    <td className="px-6 py-5">
                      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{request.product_details?.name || '—'}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{request.supplier || 'No supplier noted'}</p>
                    </td>
                    <td className="px-6 py-5 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {request.requested_by_username || '—'}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-lg font-display font-bold" style={{ color: 'var(--text-primary)' }}>{request.requested_quantity}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${STATUS_COLORS[request.status] || STATUS_COLORS.pending}`}>
                        {request.status_display || STATUS_LABELS[request.status] || request.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap items-center gap-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(request.id, 'approve')}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                              style={{ background: 'var(--btn-gradient)' }}
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(request.id, 'reject')}
                              className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-100"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(request.id, 'complete')}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100"
                          >
                            Mark received
                          </button>
                        )}
                        {['pending', 'approved'].includes(request.status) && (
                          <button
                            type="button"
                            onClick={() => handleStatusUpdate(request.id, 'cancel')}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                            style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' }}
                          >
                            Cancel
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

        <div className="px-6 py-5 border-t flex items-center justify-between" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="form-cancel-btn px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="form-cancel-btn px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <HeadlessTransition show={isModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center"
          onClose={() => setIsModalOpen(false)}
        >
          <HeadlessTransition.Child
            as={React.Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div
              className="rounded-2xl shadow-premium max-w-lg w-full overflow-hidden border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
            >
              <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Request stock</h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Tell your team what to order from a supplier.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="form-label">Product *</label>
                  <select
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className={`form-input w-full ${formErrors.product ? 'border-rose-300' : ''}`}
                  >
                    <option value="">Select product…</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </select>
                  {formErrors.product && <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.product}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.requested_quantity}
                      onChange={(e) => setFormData({ ...formData, requested_quantity: e.target.value })}
                      className={`form-input w-full ${formErrors.requested_quantity ? 'border-rose-300' : ''}`}
                      placeholder="How many?"
                    />
                    {formErrors.requested_quantity && <p className="mt-1 text-xs font-bold text-rose-500">{formErrors.requested_quantity}</p>}
                  </div>
                  <div>
                    <label className="form-label">Est. cost (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      min="0"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                      className="form-input w-full"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="form-input w-full"
                    placeholder="Who will supply this?"
                  />
                </div>

                <div>
                  <label className="form-label">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="form-input w-full"
                    placeholder="Any extra details…"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="form-cancel-btn flex-1 px-4 py-3 rounded-xl font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] px-4 py-3 btn-primary text-white rounded-xl font-bold text-xs"
                  >
                    Submit request
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
