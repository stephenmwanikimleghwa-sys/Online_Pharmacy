import React, { useState, useEffect, useRef } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';
import api from '../services/api';

// Debounce helper
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export const AddMedicineModal = ({
  isOpen,
  onClose,
  isEditMode,
  form,
  setForm,
  formErrors = {},
  onSubmit,
  categories = [],
  submitting = false,
}) => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // ── Name autocomplete state ──────────────────────────────────────────────────
  const [nameSuggestions, setNameSuggestions]   = useState([]);
  const [showSuggestions, setShowSuggestions]   = useState(false);
  const [duplicateMatch, setDuplicateMatch]     = useState(null); // exact match found
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const nameInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  const debouncedName = useDebounce(form.name, 300);

  // Fetch suggestions whenever the debounced name changes
  useEffect(() => {
    if (!isOpen || isEditMode) return;
    const query = debouncedName?.trim();
    if (!query || query.length < 2) {
      setNameSuggestions([]);
      setDuplicateMatch(null);
      return;
    }

    let cancelled = false;
    setLoadingSuggestions(true);
    api.get('/products/', { params: { context: 'inventory', search: query, page_size: 8 } })
      .then(res => {
        if (cancelled) return;
        const results = res.data?.data ?? res.data?.results ?? res.data ?? [];
        setNameSuggestions(Array.isArray(results) ? results.slice(0, 8) : []);

        // Exact duplicate check (case-insensitive)
        const exact = results.find(p => p.name?.toLowerCase() === query.toLowerCase());
        setDuplicateMatch(exact ?? null);
        setShowSuggestions(results.length > 0);
      })
      .catch(() => { if (!cancelled) setNameSuggestions([]); })
      .finally(() => { if (!cancelled) setLoadingSuggestions(false); });

    return () => { cancelled = true; };
  }, [debouncedName, isOpen, isEditMode]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (
        nameInputRef.current && !nameInputRef.current.contains(e.target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isOpen) return null;

  const inputBase = (hasError) =>
    `form-input ${hasError ? 'border-rose-300 ring-4 ring-rose-500/5 border-rose-400' : ''}`;

  // When user picks a suggestion — prefill fields and warn
  const selectSuggestion = (product) => {
    setForm(prev => ({
      ...prev,
      name: product.name,
      category: product.category || prev.category,
      dosage_form: product.dosage_form || prev.dosage_form,
      manufacturer: product.manufacturer || prev.manufacturer,
      description: product.description || prev.description,
    }));
    setDuplicateMatch(product);
    setShowSuggestions(false);
  };

  return createPortal(
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4 animate-fade-in">
      <div
        className="modal-card max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        style={{ borderRadius: 'var(--radius-surface)', background: 'var(--bg-card)' }}
      >
        <div
          className="px-5 py-4 sm:px-6 flex items-start justify-between gap-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-primary)' }}
        >
          <div>
            <h2 className="text-xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {isEditMode ? 'Edit medicine' : 'Add medicine'}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {isEditMode
                ? 'Update product details in inventory.'
                : 'Register a new product in inventory.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1" style={{ background: 'var(--bg-card)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name — full width with autocomplete */}
            <div className="md:col-span-2">
              <label className="form-label">Medicine Name</label>
              <div className="relative">
                <input
                  ref={nameInputRef}
                  name="name"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    setDuplicateMatch(null);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => { if (nameSuggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="e.g. Amoxicillin 500mg"
                  className={inputBase(formErrors.name)}
                  autoComplete="off"
                />
                {/* Loading spinner inside input */}
                {loadingSuggestions && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                  </div>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && nameSuggestions.length > 0 && (
                  <ul
                    ref={suggestionsRef}
                    className="absolute z-20 w-full bg-white border border-slate-200 mt-1 rounded-2xl shadow-xl max-h-56 overflow-y-auto overflow-x-hidden"
                  >
                    {nameSuggestions.map((product) => {
                      const isExact = product.name?.toLowerCase() === form.name?.trim().toLowerCase();
                      return (
                        <li
                          key={product.id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer text-sm transition-colors ${
                            isExact
                              ? 'bg-amber-50 hover:bg-amber-100'
                              : 'hover:bg-slate-50'
                          }`}
                          onMouseDown={(e) => { e.preventDefault(); selectSuggestion(product); }}
                        >
                          {isExact
                            ? <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            : <CheckCircleIcon className="w-4 h-4 text-slate-300 flex-shrink-0" />
                          }
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold truncate ${isExact ? 'text-amber-700' : 'text-slate-800'}`}>
                              {product.name}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {[product.category, product.dosage_form, product.manufacturer].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          {isExact && (
                            <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">
                              Exists
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Duplicate warning banner — submit is blocked until the name is unique */}
              {duplicateMatch && !isEditMode && (
                <div className="mt-3 flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-amber-700">
                      "{duplicateMatch.name}" already exists in the system.
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Duplicate products are not allowed. Use <span className="font-bold">Restock</span> or <span className="font-bold">Edit</span> on the existing item instead.
                    </p>
                  </div>
                </div>
              )}

              {formErrors.name && <p className="mt-2 text-xs font-bold text-rose-500 px-2">{formErrors.name}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="form-label">Category</label>
              <div className="relative">
                <input
                  name="category"
                  type="text"
                  value={form.category}
                  onChange={(e) => {
                    setForm({ ...form, category: e.target.value });
                    setShowCategoryDropdown(true);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  placeholder="e.g. Painkillers"
                  className={inputBase(formErrors.category)}
                  autoComplete="off"
                />
                {showCategoryDropdown && categories.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-slate-200 mt-1 rounded-xl shadow-lg max-h-48 overflow-y-auto overflow-x-hidden">
                    {categories
                      .filter(c => c.toLowerCase().includes(form.category.toLowerCase()))
                      .map((cat, idx) => (
                        <li
                          key={idx}
                          className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                          onClick={() => {
                            setForm({ ...form, category: cat });
                            setShowCategoryDropdown(false);
                          }}
                        >
                          {cat}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
              {formErrors.category && <p className="mt-2 text-xs font-bold text-rose-500 px-2">{formErrors.category}</p>}
            </div>

            {/* Dosage Form (Unit of Measure) */}
            <div>
              <label className="form-label">Unit of Measure / Form</label>
              <select
                name="dosage_form"
                value={form.dosage_form || 'other'}
                onChange={(e) => setForm({ ...form, dosage_form: e.target.value })}
                className={inputBase()}
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
                name="department"
                value={form.department || 'CHEMIST'}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className={inputBase(formErrors.department)}
              >
                <option value="CHEMIST">Chemist</option>
                <option value="AGROVET">Agrovet</option>
              </select>
              {formErrors.department && <p className="mt-2 text-xs font-bold text-rose-500 px-2">{formErrors.department}</p>}
            </div>

            {/* Buying Price (BP) */}
            <div>
              <label className="form-label">Buying Price / B.P (KES)</label>
              <input
                name="buying_price"
                type="number"
                step="0.01" inputMode="decimal"
                value={form.buying_price}
                onChange={(e) => setForm({ ...form, buying_price: e.target.value })}
                placeholder="Cost from supplier, e.g. 100"
                className={inputBase(formErrors.buying_price)}
              />
              <p className="mt-1.5 text-xs text-slate-400 px-1">
                WSP auto-set to <span className="font-bold text-emerald-600">BP × 1.15</span> &nbsp;·&nbsp; SP to <span className="font-bold text-rose-500">BP × 1.33</span>
              </p>
              {formErrors.buying_price && <p className="mt-2 text-xs font-bold text-rose-500 px-2">{formErrors.buying_price}</p>}
            </div>

            {/* Pricing Mode Toggle */}
            <div className="md:col-span-2 mt-2 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50">
              <label className="form-label flex items-center justify-between cursor-pointer mb-0">
                <span className="text-sm font-bold text-slate-700">Pricing Mode</span>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${!form.use_legacy_prices ? 'text-primary' : 'text-slate-400'}`}>Auto</span>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, use_legacy_prices: !form.use_legacy_prices })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${form.use_legacy_prices ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.use_legacy_prices ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`text-xs font-semibold ${form.use_legacy_prices ? 'text-primary' : 'text-slate-400'}`}>Manual</span>
                </div>
              </label>

              {form.use_legacy_prices && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 animate-fade-in">
                  <div>
                    <label className="form-label">Wholesale Price (KES)</label>
                    <input
                      name="wholesale_price"
                      type="number"
                      step="0.01" inputMode="decimal"
                      value={form.wholesale_price || ''}
                      onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })}
                      placeholder="e.g. 115"
                      className={inputBase(formErrors.wholesale_price)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Retail Price / SP (KES)</label>
                    <input
                      name="retail_price"
                      type="number"
                      step="0.01" inputMode="decimal"
                      value={form.retail_price || ''}
                      onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
                      placeholder="e.g. 133"
                      className={inputBase(formErrors.retail_price)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stock Quantity — create only; edits must use Restock so other branches are not overwritten */}
            {!isEditMode && (
              <div>
                <label className="form-label">Initial Stock Qty (this branch only)</label>
                <input
                  name="stock_quantity"
                  type="number"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  className={inputBase(formErrors.stock_quantity)}
                />
                {formErrors.stock_quantity && <p className="mt-2 text-xs font-bold text-rose-500 px-2">{formErrors.stock_quantity}</p>}
              </div>
            )}

            {/* Reorder Threshold */}
            <div>
              <label className="form-label">Reorder Threshold</label>
              <input
                name="reorder_threshold"
                type="number"
                min="1"
                value={form.reorder_threshold}
                onChange={(e) => setForm({ ...form, reorder_threshold: e.target.value })}
                className={inputBase(formErrors.reorder_threshold)}
              />
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Low-stock alert when quantity at this branch reaches this level.
              </p>
              {formErrors.reorder_threshold && <p className="mt-2 text-xs font-bold text-rose-500 px-2">{formErrors.reorder_threshold}</p>}
            </div>

            {/* Strength */}
            <div>
              <label className="form-label">Strength</label>
              <input
                name="strength"
                value={form.strength || ''}
                onChange={(e) => setForm({ ...form, strength: e.target.value })}
                placeholder="e.g. 500mg"
                className={inputBase(false)}
              />
            </div>

            {/* Manufacturer */}
            <div>
              <label className="form-label">Manufacturer</label>
              <input
                name="manufacturer"
                value={form.manufacturer || ''}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                placeholder="Manufacturer name"
                className={inputBase(false)}
              />
            </div>

            {/* Supplier */}
            <div>
              <label className="form-label">Supplier</label>
              <input
                name="supplier"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                placeholder="Supplier name"
                className={inputBase(false)}
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="form-label">Expiry Date</label>
              <input
                name="expiry_date"
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className={inputBase(formErrors.expiry_date)}
              />
              {formErrors.expiry_date && <p className="mt-2 text-xs font-bold text-rose-500 px-2">{formErrors.expiry_date}</p>}
            </div>

            {/* Description — full width */}
            <div className="md:col-span-2">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Brief description of the medicine..."
                className="form-input"
              />
            </div>

            {/* Product Image — full width */}
            <div className="md:col-span-2">
              <label className="form-label">Product Image</label>
              <div className="relative group border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer" style={{borderColor:'var(--border-primary)', background:'var(--bg-field)'}}>
                <input
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setForm({ ...form, image: e.target.files[0] })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  <svg className="w-10 h-10 text-slate-300 group-hover:text-primary mx-auto mb-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-xs font-bold text-slate-500 group-hover:text-slate-700">
                    {form.image && form.image instanceof File ? form.image.name : 'Click or drop to upload'}
                  </p>
                </div>
              </div>
              {form.image && typeof form.image === 'string' && (
                <img src={form.image} alt="Product preview" className="mt-3 h-20 w-20 object-cover rounded-2xl border border-slate-200 shadow-sm" />
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 form-cancel-btn rounded-lg px-5 py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (!isEditMode && Boolean(duplicateMatch))}
              className="flex-[2] px-5 py-2.5 btn-primary text-white rounded-lg font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting
                ? (isEditMode ? 'Saving…' : 'Adding…')
                : (isEditMode ? 'Save changes' : 'Add medicine')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};