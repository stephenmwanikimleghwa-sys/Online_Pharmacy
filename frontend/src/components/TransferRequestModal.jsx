import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { createTransferRequest } from '../services/procurementService';
import LoadingButton from './LoadingButton';

const TransferRequestModal = ({
  product,
  availability,
  activeBranch,
  onClose,
  onSuccess,
}) => {
  const { notify } = useNotification();
  const [quantity, setQuantity] = useState(1);
  const [sourceBranchId, setSourceBranchId] = useState(
    availability?.other_branches?.[0]?.branch_id || '',
  );
  const [submitting, setSubmitting] = useState(false);

  const sources = availability?.other_branches || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sourceBranchId || !quantity) {
      notify.warning('Missing fields', 'Select a source branch and quantity.');
      return;
    }
    setSubmitting(true);
    try {
      await createTransferRequest({
        product: product.id,
        source_branch: sourceBranchId,
        destination_branch: activeBranch?.id,
        quantity: Number(quantity),
        notes: `Transfer request from OTC sale — ${product.name}`,
      });
      notify.success(
        'Transfer request submitted',
        'An admin will approve it shortly.',
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      notify.error(
        'Request failed',
        err.response?.data?.message || 'Could not submit transfer request.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-bold mb-4">Request Stock Transfer</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Product</label>
            <p className="font-semibold">{product?.name}</p>
          </div>
          <div>
            <label className="form-label">From</label>
            <select
              className="form-input w-full"
              value={sourceBranchId}
              onChange={(e) => setSourceBranchId(e.target.value)}
              required
            >
              <option value="">Select branch with stock</option>
              {sources.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.branch_name} ({b.quantity} units)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">To</label>
            <p className="font-semibold">{activeBranch?.name} (your branch)</p>
          </div>
          <div>
            <label className="form-label">Quantity</label>
            <input
              type="number"
              min="1"
              className="form-input w-full"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" className="btn-secondary px-4 py-2 rounded-lg" onClick={onClose}>
              Cancel
            </button>
            <LoadingButton type="submit" loading={submitting} className="btn-primary px-4 py-2 rounded-lg">
              Submit Request
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferRequestModal;
