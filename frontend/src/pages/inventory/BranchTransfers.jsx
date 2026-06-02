import React, { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { notifyApiError } from '../../utils/notifyApiError';
import LoadingButton from '../../components/LoadingButton';
import { useAuth } from '../../context/AuthContext';
import ActiveBranchGuard from '../../components/ActiveBranchGuard';
import inventoryService from '../../services/inventoryService';

const BranchTransfers = () => {
  const { notify } = useNotification();
  const { activeBranch, allowedBranches } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
      const res = await inventoryService.getTransfers({
        source_branch: activeBranch.id,
      });
      const list = res.data?.results ?? res.data ?? [];
      setTransfers(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error(err);
      notify.error('Could Not Load Transfers', 'Transfer history could not be loaded. Please refresh.');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [activeBranch?.id]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await inventoryService.getInventory({ per_page: 500 });
        const data = res.data || {};
        const list = Array.isArray(data) ? data : (data.products || data.results || []);
        setProducts(Array.isArray(list) ? list : []);
      } catch {
        setProducts([]);
      }
    };
    loadProducts();
  }, [activeBranch?.id]);

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
      loadTransfers();
    } catch (err) {
      notifyApiError(notify, err, 'Transfer Failed', 'The transfer request could not be created.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await inventoryService.approveTransfer(id);
      notify.success('Transfer Approved', 'Stock has been moved and branch levels have been updated.');
      loadTransfers();
    } catch (err) {
      notifyApiError(notify, err, 'Approval Failed', 'Could not approve this transfer.');
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
            From <strong>{activeBranch?.name}</strong> to another branch. Stock is moved when the transfer is completed.
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
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Request transfer'}
              </button>
            </div>
          </form>
        </div>

        <div className="glass-card rounded-[2rem] p-8 border border-white/60 shadow-premium">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            Transfers from {activeBranch?.name}
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
                      <td className="py-3 pr-4">{t.destination_branch_name}</td>
                      <td className="py-3 pr-4">{t.quantity}</td>
                      <td className="py-3 pr-4 capitalize">{t.status}</td>
                      <td className="py-3">
                        {t.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(t.id)}
                            className="text-xs font-bold text-indigo-600 hover:underline"
                          >
                            Approve
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
      </div>
    </ActiveBranchGuard>
  );
};

export default BranchTransfers;
