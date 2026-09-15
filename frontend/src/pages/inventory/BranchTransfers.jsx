import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from '../../context/NotificationContext';
import { notifyApiError } from '../../utils/notifyApiError';
import LoadingButton from '../../components/LoadingButton';
import { useAuth } from '../../context/AuthContext';
import ActiveBranchGuard from '../../components/ActiveBranchGuard';
import inventoryService from '../../services/inventoryService';
import { unwrapList } from '../../utils/parseApiData';

/**
 * Typeahead product picker.
 * A plain <select> only ever got the first 500 names (alphabetically ≈ A–C).
 * Search hits the API with `search=` so any product past C can be found.
 */
function TransferProductSearch({ branchId, selected, onSelect }) {
  const [query, setQuery] = useState(selected?.name || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (selected?.name) setQuery(selected.name);
  }, [selected?.id, selected?.name]);

  const search = useCallback(
    async (q) => {
      const term = (q || '').trim();
      if (term.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await inventoryService.getInventory({
          search: term,
          per_page: 80,
          branch: branchId || undefined,
          scope: 'local',
        });
        const data = res.data || {};
        const nested =
          data && typeof data === 'object' && data.data && typeof data.data === 'object'
            ? data.data
            : data;
        const list = unwrapList(nested);
        setResults(list);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [branchId],
  );

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onSelect(null);
    setOpen(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => void search(val), 300);
  };

  const pick = (p) => {
    setQuery(p.name);
    setOpen(false);
    setResults([]);
    onSelect(p);
  };

  return (
    <div className="relative">
      <input
        type="text"
        className="form-input w-full"
        placeholder="Search product name (min. 2 letters)…"
        value={query}
        onChange={handleInput}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        autoComplete="off"
        required={!selected?.id}
      />
      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
        Type part of the name — the list is too large to show all products at once.
      </p>
      {searching && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Searching…</p>
      )}
      {open && results.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-hidden max-h-56 overflow-y-auto"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}
        >
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm border-b last:border-0 hover:opacity-90"
              style={{ borderColor: 'var(--border-primary)' }}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
            >
              <span className="font-semibold block" style={{ color: 'var(--text-primary)' }}>
                {p.name}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {p.stock_quantity != null ? `Stock: ${p.stock_quantity}` : 'Stock: —'}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && !searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          No products match “{query.trim()}”.
        </p>
      )}
      {selected?.id && (
        <p className="text-xs mt-1 font-medium" style={{ color: '#047857' }}>
          Selected: {selected.name}
          {selected.stock_quantity != null ? ` (stock ${selected.stock_quantity})` : ''}
        </p>
      )}
    </div>
  );
}

const BranchTransfers = () => {
  const { notify } = useNotification();
  const { user, activeBranch, allowedBranches } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.is_admin;
  const [transfers, setTransfers] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approvingTransfer, setApprovingTransfer] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({
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
      notifyApiError(notify, err, 'Could Not Load Transfers', 'Transfer history could not be loaded. Please refresh.');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [activeBranch?.id, notify]);

  useEffect(() => {
    void loadTransfers();
  }, [loadTransfers]);

  useEffect(() => {
    setSelectedProduct(null);
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
    if (!selectedProduct?.id || !form.destination_branch || !quantity || quantity < 1) {
      notify.error('Incomplete Information', 'Product, destination branch, and quantity are required.');
      return;
    }

    try {
      setSubmitting(true);
      const dest = destinationOptions.find((b) => b.id === parseInt(form.destination_branch, 10));
      await inventoryService.createTransfer({
        product: selectedProduct.id,
        source_branch: activeBranch.id,
        destination_branch: parseInt(form.destination_branch, 10),
        quantity,
        notes: form.notes,
      });
      notify.success(
        'Transfer Requested',
        `Stock transfer from ${activeBranch.name} to ${dest?.name || 'the selected branch'} has been submitted for approval.`,
      );
      setForm({ destination_branch: '', quantity: '', notes: '' });
      setSelectedProduct(null);
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
      <div className="space-y-6">
        <div className="glass-card rounded-xl p-5 sm:p-6 border" style={{ borderColor: 'var(--border-primary)' }}>
          <h2 className="text-lg font-display font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            New stock transfer
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
            From <strong>{activeBranch?.name}</strong> to another branch. Stock moves when approved.
          </p>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">Product</label>
              <TransferProductSearch
                branchId={activeBranch?.id}
                selected={selectedProduct}
                onSelect={setSelectedProduct}
              />
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

        <div className="glass-card rounded-xl p-5 sm:p-6 border" style={{ borderColor: 'var(--border-primary)' }}>
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
            <div className="glass-card rounded-xl p-6 max-w-md w-full border " style={{ background: 'var(--bg-card)' }}>
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
            <div className="glass-card rounded-xl p-6 max-w-md w-full border " style={{ background: 'var(--bg-card)' }}>
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
