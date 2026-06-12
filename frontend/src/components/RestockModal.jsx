import React, { useState, useEffect } from 'react';
import { getProductUnitLabel } from '../utils/displayHelpers';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const RestockModal = ({ item, onClose, onRestock }) => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load branches from API
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await api.get('/users/branches/');
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.results || data.branches || []);
        setBranches(list);
        // Default selection: admin sees all, others see their own branch
        if (user?.role === 'admin') {
          // No default — let admin pick
        } else if (user?.branch?.id) {
          setSelectedBranch(String(user.branch.id));
        } else if (list.length === 1) {
          setSelectedBranch(String(list[0].id));
        }
      } catch (err) {
        // Fallback to known static branches if API fails
        const fallback = [
          { id: 1, name: 'Main Branch' },
          { id: 2, name: 'Transcounty Main' },
          { id: 3, name: 'Transcounty Annex' },
          { id: 4, name: 'Peakfarm' },
        ];
        setBranches(fallback);
        if (user?.branch?.id) setSelectedBranch(String(user.branch.id));
      }
    };
    loadBranches();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!quantity || isNaN(qty) || qty <= 0) {
      notify.warning('Invalid Quantity', 'Quantity must be at least 1.');
      return;
    }
    if (!selectedBranch) {
      notify.warning('Branch Required', 'Please select a branch before restocking.');
      return;
    }

    setLoading(true);
    try {
      await onRestock(item.id, qty, reason, parseInt(selectedBranch, 10));
      onClose();
    } catch (error) {
      console.error('Error restocking item:', error);
      // error notification is handled by the parent's handleRestock via notifyApiError
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
          {/* Branch Selection */}
          <div className="mb-6">
            <label className="form-label">
              Branch *
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              required
              className="form-input"
            >
              <option value="">Select Branch</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
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

          {/* Notes */}
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
