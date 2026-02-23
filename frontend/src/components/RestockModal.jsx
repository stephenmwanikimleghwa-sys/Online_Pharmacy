import React, { useState } from 'react';

const RestockModal = ({ item, onClose, onRestock }) => {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity');
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-premium max-w-md w-full overflow-hidden animate-scale-up border-[8px] border-white ring-1 ring-slate-200">
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full -mr-12 -mt-12 blur-2xl"></div>
          <h2 className="text-2xl font-display font-bold relative z-10">Add stock</h2>
          <p className="text-slate-400 text-xs mt-2 font-medium relative z-10 uppercase tracking-widest">{item.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 bg-slate-50/30">
          <div className="mb-6">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
              How many to add? *
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
              placeholder="Number of units..."
            />
          </div>

          <div className="mb-8">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
              Notes (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 shadow-sm"
              placeholder="e.g. new delivery, supplier name..."
              rows="3"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-200/50 text-slate-600 rounded-2xl hover:bg-slate-200 font-bold text-xs uppercase tracking-widest transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-premium hover:shadow-glow font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
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
