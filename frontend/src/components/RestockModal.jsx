import React, { useState } from 'react';
import { getProductUnitLabel } from '../utils/displayHelpers';
import { useNotification } from '../context/NotificationContext';
import LoadingButton from './LoadingButton';

const RestockModal = ({ item, onClose, onRestock }) => {
  const { notify } = useNotification();
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) {
      notify.warning('Invalid Quantity', 'Quantity must be at least 1.');
      return;
    }

    setLoading(true);
    try {
      await onRestock(item.id, parseInt(quantity), reason);
      onClose();
    } catch (error) {
      console.error('Error restocking item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="modal-card max-w-md w-full overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="modal-header">
          <h2 className="text-2xl font-display font-bold relative z-10">Add stock</h2>
          <p className="text-white/70 text-xs mt-2 font-medium relative z-10 uppercase tracking-widest">{item.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8" style={{ background: 'var(--bg-card)' }}>
          <div className="mb-6">
            <label className="form-label">
              How many to add? *
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="form-input"
              placeholder={`Number of ${getProductUnitLabel(item, 2)}...`}
            />
          </div>

          <div className="mb-8">
            <label className="form-label">
              Notes (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-input resize-none"
              style={{ height: 'auto' }}
              placeholder="e.g. new delivery, supplier name..."
              rows="3"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="form-cancel-btn flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-[2] px-6 py-4 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Add stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestockModal;
