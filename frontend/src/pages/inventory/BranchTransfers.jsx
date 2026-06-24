import React, { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { notifyApiError } from '../../utils/notifyApiError';
import LoadingButton from '../../components/LoadingButton';
import { useAuth } from '../../context/AuthContext';
import ActiveBranchGuard from '../../components/ActiveBranchGuard';
import inventoryService from '../../services/inventoryService';

const BranchTransfers = () => {
  const { notify } = useNotification();
  const { user, activeBranch, allowedBranches } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.is_admin;
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approvingTransfer, setApprovingTransfer] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({
    product: '',
    destination_branch: '',
    quantity: '',
    notes: '',
  });

  const destinationOptions = (allowedBranches || []).filter(
    (b) => b.id !== activeBranch?.id,
  );

  const loadTransfers = useCallback(async () => {
    if (!activeBranch?.id) return;
    try {
      setLoading(true);
      const res = await inventoryService.getTransfers({ status: undefined });
      const list = res.data?.results ?? res.data ?? [];
      setTransfers(Array.isArray(list) ? list : []);
    } catch (err) {
      notify.error('Could Not Load Transfers', 'Transfer history could not be loaded. Please refresh.');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [activeBranch?.id, notify]);

  useEffect(() => {
    void loadTransfers();
  }, [loadTransfers]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await inventoryService.getInventory({ per_page: 5000 });
        const data = res.data || {};
        const list = Array.isArray(data) ? data : (data.products || data.results || []);
        setProducts(Array.isArray(list) ? list : []);
      } catch {
        setProducts([]);
      }
    };
    void loadProducts();
  }, [activeBranch?.id]);

  const canApprove = (transfer) => {
    if (transfer.status !== 'pending') return false;
    if (isAdmin) return true;
    return Number(transfer.destination_branch) === Number(activeBranch?.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeBranch?.id) {
      notify.warning('No Branch Selected', 'Select which branch you are working at before requesting a transfer.');
      return;
    }
    const quantity = parseInt(form.quantity, 10);
    if (!form.product || !form.destination_branch || !quantity || quantity < 1) {
      notify.error('Incomplete Information', 'Product, destination branch, and quantity are required.');
      return;
    }

    try {
      setSubmitting(true);
      const dest = destinationOptions.find((b) => b.id === parseInt(form.destination_branch, 10));
      await inventoryService.createTransfer({
        product: parseInt(form.product, 10),
        source_branch: activeBranch.id,
        destination_branch: parseInt(form.destination_branch, 10),
        quantity,
        notes: form.notes,
      });
      notify.success(
        'Transfer Requested',
        `Stock transfer from ${activeBranch.name} to ${dest?.name || 'the selected branch'} has been submitted for approval.`,
      );
      setForm({ product: '', destination_branch: '', quantity: '', notes: '' });
      void loadTransfers();
    } catch (err) {
      notifyApiError(notify, err, 'Transfer Failed', 'The transfer request could not be created.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await inventoryService.approveTransfer(id);
      setApprovingTransfer(null);
      notify.success('Transfer Approved', 'Stock has been moved and branch levels have been updated.');
      void loadTransfers();
    } catch (err) {
      notifyApiError(notify, err, 'Approval Failed', 'Could not approve this transfer.');
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason.trim()) {
      notify.warning('Reason required', 'Enter a rejection reason.');
      return;
    }
    try {
      await inventoryService.rejectTransfer(rejectingId, rejectReason.trim());
      notify.success('Transfer Rejected', 'The transfer request was rejected.');
      setRejectingId(null);
      setRejectReason('');
      void loadTransfers();
    } catch (err) {
      notifyApiError(notify, err, 'Rejection Failed', 'Could not reject this transfer.');
    }
  };

  return (
    <ActiveBranchGuard title="Active branch required for transfers">
      <div className="space-y-10">
        <div className="glass-card rounded-[2rem] p-8 border border-white/60 shadow-premium">
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            New stock transfer
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            From <strong>{activeBranch?.name}</strong> to another branch. Stock is moved when the transfer is approved.
          </p>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Product</label>
              <select
                className="form-input w-full"
                value={form.product}
                onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
                required
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.stock_quantity != null ? `(stock: ${p.stock_quantity})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Destination branch</label>
              <select
                className="form-input w-full"
                value={form.destination_branch}
                onChange={(e) => setForm((f) => ({ ...f, destination_branch: e.target.value }))}
                required
              >
                <option value="">Select branch</option>
                {destinationOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min="1"
                className="form-input w-full"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label">Notes (optional)</label>
              <input
                type="text"
                className="form-input w-full"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <LoadingButton
                type="submit"
                loading={submitting}
                className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm"
              >
                Request transfer
              </LoadingButton>
            </div>
          </form>
        </div>

        <div className="glass-card rounded-[2rem] p-8 border border-white/60 shadow-premium">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Transfers for {activeBranch?.name}
          </h2>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : transfers.length === 0 ? (
            <p className="text-sm text-gray-500">No transfers found for this branch.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b" style={{ borderColor: 'var(--border-primary)' }}>
                    <th className="pb-2 pr-4">Product</th>
                    <th className="pb-2 pr-4">From</th>
                    <th className="pb-2 pr-4">To</th>
                    <th className="pb-2 pr-4">Qty</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 pr-4">{t.product_name}</td>
                      <td className="py-3 pr-4">{t.source_branch_name}</td>
                      <td className="py-3 pr-4">{t.destination_branch_name}</td>
                      <td className="py-3 pr-4">{t.quantity}</td>
                      <td className="py-3 pr-4 capitalize">{t.status}</td>
                      <td className="py-3 space-x-2 whitespace-nowrap">
                        {canApprove(t) && (
                          <button
                            type="button"
                            onClick={() => setApprovingTransfer(t)}
                            className="text-xs font-bold text-indigo-600 hover:underline"
                          >
                            Approve
                          </button>
                        )}
                        {t.status === 'pending' && isAdmin && (
                          <button
                            type="button"
                            onClick={() => { setRejectingId(t.id); setRejectReason(''); }}
                            className="text-xs font-bold text-red-600 hover:underline"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {approvingTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-card rounded-[2rem] p-6 max-w-md w-full border border-white/60 shadow-premium" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Confirm action</p>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Approve transfer</h3>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Approved</span>
              </div>
              <div className="text-sm space-y-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Product:</span> {approvingTransfer.product_name}</p>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Quantity:</span> {approvingTransfer.quantity}</p>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>From:</span> {approvingTransfer.source_branch_name}</p>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>To:</span> {approvingTransfer.destination_branch_name}</p>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Requested by:</span> {approvingTransfer.requested_by || 'Unknown'}</p>
                <p><span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Requested at:</span> {new Date(approvingTransfer.created_at).toLocaleString()}</p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="form-cancel-btn px-4 py-2 rounded-xl" onClick={() => setApprovingTransfer(null)}>
                  Cancel
                </button>
                <LoadingButton type="button" onClick={() => handleApprove(approvingTransfer.id)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold">
                  Approve
                </LoadingButton>
              </div>
            </div>
          </div>
        )}

        {rejectingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-card rounded-[2rem] p-6 max-w-md w-full border border-white/60 shadow-premium" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">Confirm action</p>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Reject transfer</h3>
                </div>
                <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">Rejected</span>
              </div>
              <textarea
                className="form-input w-full mb-4"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
              />
              <div className="flex justify-end gap-2">
                <button type="button" className="form-cancel-btn px-4 py-2 rounded-xl" onClick={() => setRejectingId(null)}>
                  Cancel
                </button>
                <LoadingButton type="button" onClick={handleReject} className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold">
                  Reject
                </LoadingButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </ActiveBranchGuard>
  );
};

export default BranchTransfers;
