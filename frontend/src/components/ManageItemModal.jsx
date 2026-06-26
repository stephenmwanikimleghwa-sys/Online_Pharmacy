import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getProductUnitLabel } from '../utils/displayHelpers';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { notifyApiError } from '../utils/notifyApiError';
import api from '../services/api';

/**
 * ManageItemModal
 * A single modal that combines Restock, Edit, and Delete for an inventory item.
 * Opened from the "Manage" button in the Inventory Management stock list.
 */
const ManageItemModal = ({ item, onClose, onRestock, onEdit, onDelete }) => {
  const { notify } = useNotification();
  const { user } = useAuth();

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('restock');

  // ── Restock state ─────────────────────────────────────────────────────────
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [restockLoading, setRestockLoading] = useState(false);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: item.name || '',
    category: item.category || '',
    buying_price: item.buying_price || '',
    use_legacy_prices: false,
    wholesale_price: item.wholesale_price || '',
    retail_price: item.selling_price || '',
    dosage_form: item.dosage_form || 'other',
    strength: item.strength || '',
    description: item.description || '',
    reorder_threshold: item.reorder_threshold ?? 10,
    department: item.department || 'CHEMIST',
    expiry_date: item.expiry_date || '',
    supplier: item.supplier || '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // ── Delete state ──────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Load branches & suppliers ─────────────────────────────────────────────
  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await api.get('/auth/branches/');
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.results || data.branches || []);
        setBranches(list);
        if (user?.role === 'admin') {
          // no default — let admin pick
        } else if (user?.branch?.id) {
          setSelectedBranch(String(user.branch.id));
        } else if (list.length === 1) {
          setSelectedBranch(String(list[0].id));
        }
      } catch {
        const fallback = [
          { id: 2, name: 'Transcounty Main' },
          { id: 3, name: 'Transcounty Annex' },
          { id: 4, name: 'Peakfarm' },
        ];
        setBranches(fallback);
        if (user?.branch?.id) setSelectedBranch(String(user.branch.id));
      }
    };

    const loadSuppliers = async () => {
      try {
        const res = await api.get('/inventory/suppliers/');
        const data = res.data;
        const list = Array.isArray(data) ? data : (data.results || data.suppliers || []);
        setSuppliers(list);
      } catch {
        setSuppliers([]);
      }
    };

    loadBranches();
    loadSuppliers();
  }, [user]);

  // ── Restock submit ────────────────────────────────────────────────────────
  const handleRestock = async (e) => {
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
    setRestockLoading(true);
    try {
      await onRestock(
        item.id,
        qty,
        reason,
        parseInt(selectedBranch, 10),
        { supplier_id: supplierId || undefined, expiry_date: expiryDate || undefined }
      );
      notify.success('Stock Updated', 'Inventory levels have been updated for this product.');
      onClose();
    } catch (error) {
      notifyApiError(notify, error, 'Restock Failed', 'Could not update stock for this item.');
    } finally {
      setRestockLoading(false);
    }
  };

  // ── Edit submit ───────────────────────────────────────────────────────────
  const validateEdit = () => {
    const errors = {};
    if (!form.name?.trim()) errors.name = 'Name is required';
    if (!form.category?.trim()) errors.category = 'Category is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateEdit()) return;
    setEditLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        dosage_form: form.dosage_form,
        department: form.department,
        strength: form.strength?.trim() || '',
        description: form.description?.trim() || '',
        supplier: form.supplier?.trim() || null,
        expiry_date: form.expiry_date || null,
        reorder_threshold: Number(form.reorder_threshold) || 10,
        ...(form.buying_price ? { buying_price: Number(form.buying_price) } : {}),
        ...(form.wholesale_price ? { wholesale_price: Number(form.wholesale_price) } : {}),
        ...(form.retail_price ? { retail_price: Number(form.retail_price) } : {}),
      };
      await api.patch(`/products/${item.id}/`, payload);
      notify.success('Medicine Updated', 'The product details have been saved.');
      onEdit?.();
      onClose();
    } catch (error) {
      notifyApiError(notify, error, 'Edit Failed', 'Could not save changes.');
      if (error?.response?.data) setFormErrors(error.response.data);
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/products/${item.id}/`);
      notify.success('Medicine Deleted', `${item.name} has been removed from inventory.`);
      onDelete?.();
      onClose();
    } catch (error) {
      notifyApiError(notify, error, 'Delete Failed', 'Could not delete this medicine.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Tabs config ───────────────────────────────────────────────────────────
  const tabs = [
    {
      id: 'restock',
      label: 'Restock',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z" />
        </svg>
      ),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      danger: true,
    },
  ];

  const inputBase = (hasError) =>
    `form-input w-full ${hasError ? 'border-rose-300 ring-4 ring-rose-500/5 border-rose-400' : ''}`;

  return createPortal(
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="modal-card max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-up rounded-[2rem] flex flex-col">

        {/* ── Header ── */}
        <div className="modal-header flex-shrink-0">
          <div className="flex items-start justify-between relative z-10">
            <div>
              <h2 className="text-2xl font-display font-bold">Manage Medicine</h2>
              <p className="text-white/70 text-xs mt-1.5 font-medium uppercase tracking-widest truncate max-w-xs">
                {item.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab bar inside header */}
          <div className="flex gap-1 mt-5 p-1 bg-white/10 rounded-2xl relative z-10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 ${
                  activeTab === tab.id
                    ? tab.danger
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-white text-primary shadow-sm'
                    : tab.danger
                    ? 'text-rose-200 hover:text-white hover:bg-white/10'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="overflow-y-auto flex-1" style={{ background: 'var(--bg-card)' }}>

          {/* ── RESTOCK TAB ── */}
          {activeTab === 'restock' && (
            <form onSubmit={handleRestock} className="p-8 space-y-6">
              {/* Branch */}
              <div>
                <label className="form-label">Branch *</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  required
                  className="form-input w-full"
                >
                  <option value="">Select Branch</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Supplier */}
              <div>
                <label className="form-label">Supplier (optional)</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Expiry Date */}
              <div>
                <label className="form-label">Expiry date (optional)</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="form-input w-full"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="form-label">How many to add? *</label>
                <input
                  type="number"
                  min="1" inputMode="numeric" value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="form-input w-full"
                  placeholder={`Number of ${getProductUnitLabel(item, 2)}...`}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="form-label">Notes (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="form-input w-full resize-none"
                  placeholder="e.g. new delivery, supplier name..."
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="form-cancel-btn flex-1"
                  disabled={restockLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-[2] px-6 py-4 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                  disabled={restockLoading}
                >
                  {restockLoading ? 'Saving...' : 'Add Stock'}
                </button>
              </div>
            </form>
          )}

          {/* ── EDIT TAB ── */}
          {activeTab === 'edit' && (
            <form onSubmit={handleEditSubmit} className="p-8 space-y-5">
              {/* Name */}
              <div>
                <label className="form-label">Medicine Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Amoxicillin 500mg"
                  className={inputBase(formErrors.name)}
                />
                {formErrors.name && (
                  <p className="mt-1 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-1">{formErrors.name}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="form-label">Category *</label>
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="e.g. Painkillers"
                  className={inputBase(formErrors.category)}
                />
                {formErrors.category && (
                  <p className="mt-1 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-1">{formErrors.category}</p>
                )}
              </div>

              {/* Dosage Form */}
              <div>
                <label className="form-label">Unit of Measure / Form</label>
                <select
                  value={form.dosage_form}
                  onChange={(e) => setForm({ ...form, dosage_form: e.target.value })}
                  className="form-input w-full"
                >
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="syrup">Syrup</option>
                  <option value="injection">Injection</option>
                  <option value="cream">Cream/Ointment</option>
                  <option value="drops">Drops</option>
                  <option value="inhaler">Inhaler</option>
                  <option value="solution">Solution</option>
                  <option value="powder">Powder</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="form-label">Department</label>
                <select
                  value={form.department || 'CHEMIST'}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="form-input w-full"
                >
                  <option value="CHEMIST">Chemist</option>
                  <option value="AGROVET">Agrovet</option>
                </select>
                {formErrors.department && (
                  <p className="mt-1 text-[10px] font-bold text-rose-500 uppercase tracking-widest px-1">{formErrors.department}</p>
                )}
              </div>

              {/* Buying Price */}
              <div>
                <label className="form-label">Buying Price / B.P (KES)</label>
                <input
                  type="number"
                  step="0.01" inputMode="decimal"
                  value={form.buying_price}
                  onChange={(e) => setForm({ ...form, buying_price: e.target.value })}
                  placeholder="e.g. 100"
                  className={inputBase(formErrors.buying_price)}
                />
                <p className="mt-1 text-[10px] text-slate-400 px-1">
                  WSP auto-set to <span className="font-bold text-emerald-600">BP × 1.15</span>
                  &nbsp;·&nbsp; SP to <span className="font-bold text-rose-500">BP × 1.33</span>
                </p>
              </div>

              {/* Manual pricing toggle */}
              <div className="p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
                <label className="form-label flex items-center justify-between cursor-pointer mb-0">
                  <span className="text-sm font-bold text-slate-700">Override Prices Manually</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, use_legacy_prices: !form.use_legacy_prices })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.use_legacy_prices ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.use_legacy_prices ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </label>
                {form.use_legacy_prices && (
                  <div className="grid grid-cols-2 gap-4 mt-4 animate-fade-in">
                    <div>
                      <label className="form-label">Wholesale Price (KES)</label>
                      <input
                        type="number"
                        step="0.01" inputMode="decimal"
                        value={form.wholesale_price}
                        onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })}
                        placeholder="e.g. 115"
                        className="form-input w-full"
                      />
                    </div>
                    <div>
                      <label className="form-label">Retail / SP (KES)</label>
                      <input
                        type="number"
                        step="0.01" inputMode="decimal"
                        value={form.retail_price}
                        onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
                        placeholder="e.g. 133"
                        className="form-input w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Strength */}
              <div>
                <label className="form-label">Strength</label>
                <input
                  value={form.strength}
                  onChange={(e) => setForm({ ...form, strength: e.target.value })}
                  placeholder="e.g. 500mg"
                  className="form-input w-full"
                />
              </div>

              {/* Reorder Threshold */}
              <div>
                <label className="form-label">Reorder Threshold</label>
                <input
                  type="number"
                  value={form.reorder_threshold}
                  onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="form-label">Expiry Date</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Brief description..."
                  className="form-input w-full resize-none"
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="form-cancel-btn flex-1"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-[2] px-6 py-4 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* ── DELETE TAB ── */}
          {activeTab === 'delete' && (
            <div className="p-8 space-y-5">

              {/* Medicine identity card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl border" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {[item.category, item.department, item.dosage_form].filter(Boolean).join(' · ') || 'No additional info'}
                  </p>
                </div>
              </div>

              {/* What will be deleted */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-3" style={{ color: 'var(--text-muted)' }}>What will be removed</p>
                <ul className="space-y-2">
                  {[
                    { icon: '📦', label: 'All stock quantities across every branch' },
                    { icon: '💰', label: 'Buying price, selling price, and wholesale price records' },
                    { icon: '📋', label: 'Stock intake history and restock logs' },
                    { icon: '🏷️', label: 'Product details — category, dosage form, strength, description' },
                    { icon: '🔗', label: 'Any linked restock requests for this medicine' },
                  ].map((consequence, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-field)' }}>
                      <span className="text-base flex-shrink-0 mt-0.5">{consequence.icon}</span>
                      <span className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{consequence.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cannot be undone notice */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200">
                <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs font-semibold text-rose-700">This action is permanent and cannot be undone.</p>
              </div>

              <div className="flex gap-4 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="form-cancel-btn flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-[2] px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Medicine
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── DELETE CONFIRMATION POP-UP ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <div
            className="w-full max-w-sm rounded-[1.75rem] overflow-hidden shadow-2xl animate-scale-up"
            style={{ background: 'var(--bg-card)' }}
          >
            {/* Red accent top bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-rose-600" />

            <div className="p-7">
              {/* Icon + title */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold" style={{ color: 'var(--text-primary)' }}>Confirm Deletion</h3>
                  <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>This will take effect immediately</p>
                </div>
              </div>

              {/* Summary of what happens */}
              <div className="rounded-2xl border p-4 space-y-3 mb-6" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>If you confirm, the following will happen</p>
                {[
                  `"${item.name}" will be permanently deleted from inventory`,
                  'All branch stock quantities will be set to zero and removed',
                  'Pricing records (BP, SP, WSP) will be erased',
                  'Stock intake logs linked to this product will be cleared',
                  'Any pending restock requests for this item will be cancelled',
                ].map((line, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0 mt-1.5" />
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{line}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                  className="flex-1 form-cancel-btn py-3"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteLoading}
                  className="flex-[1.5] py-3 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleteLoading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Yes, Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default ManageItemModal;
