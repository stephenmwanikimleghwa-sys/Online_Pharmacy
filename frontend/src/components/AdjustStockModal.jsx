import React, { useState } from 'react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

const AdjustStockModal = ({ item, onClose, onSuccess }) => {
  const { notify } = useNotification();
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!qty || isNaN(qty)) {
      setError('Please enter a valid number');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      await api.post(`/inventory/${item.id}/adjust/`, {
        quantity: parseInt(qty, 10),
        reason: reason || 'Manual adjustment',
        change_type: 'adjustment'
      });
      notify.success('Stock Adjusted', `Stock for ${item.name} has been updated.`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="modal-card w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-800">Adjust Stock</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div className="text-rose-600 bg-rose-50 p-3 rounded-xl text-sm font-medium">{error}</div>}
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Item</label>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 font-medium">{item.name}</div>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Adjustment Quantity (+ or -)</label>
            <input 
              type="number" 
              value={qty} 
              onChange={e => setQty(e.target.value)} 
              placeholder="e.g. -5 to reduce, 10 to add"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Reason (Required)</label>
            <input 
              type="text" 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="e.g. Expired, Damaged, Audit correction"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              required 
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Adjusting...' : 'Confirm Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustStockModal;
