import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { notifyApiError } from '../utils/notifyApiError';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const DOSAGE_FORMS = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'injection', label: 'Injection' },
  { value: 'cream', label: 'Cream/Ointment' },
  { value: 'drops', label: 'Drops' },
  { value: 'inhaler', label: 'Inhaler' },
  { value: 'solution', label: 'Solution' },
  { value: 'powder', label: 'Powder' },
  { value: 'suppository', label: 'Suppository' },
  { value: 'patch', label: 'Patch' },
  { value: 'other', label: 'Other' },
];

const EMPTY_ROW = () => ({
  id: Date.now() + Math.random(),
  name: '',
  category: '',
  dosage_form: 'tablet',
  buying_price: '',
  retail_price: '',
  stock_quantity: '',
  expiry_date: '',
  manufacturer: '',
});

const BulkAddMedicineModal = ({ isOpen, onClose, onSuccess, categories = [] }) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([EMPTY_ROW()]);
  const [rowErrors, setRowErrors] = useState({});

  if (!isOpen) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const addRow = () => {
    setRows(prev => [...prev, EMPTY_ROW()]);
  };

  const removeRow = (id) => {
    setRows(prev => prev.filter(r => r.id !== id));
    setRowErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    // Clear error for this field on change
    setRowErrors(prev => {
      if (!prev[id]?.[field]) return prev;
      const rowErr = { ...prev[id] };
      delete rowErr[field];
      return { ...prev, [id]: rowErr };
    });
  };

  // ── Validation ───────────────────────────────────────────────────────────────

  const validateRows = () => {
    const errors = {};
    rows.forEach(row => {
      const rowErr = {};
      if (!row.name.trim()) rowErr.name = 'Name required';
      if (!row.buying_price || parseFloat(row.buying_price) <= 0) rowErr.buying_price = 'Required';
      if (row.stock_quantity === '' || parseInt(row.stock_quantity) < 0) rowErr.stock_quantity = 'Required';
      if (Object.keys(rowErr).length) errors[row.id] = rowErr;
    });
    return errors;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateRows();
    if (Object.keys(errors).length) {
      setRowErrors(errors);
      notify.error('Validation Error', 'Please fix the highlighted fields before submitting.');
      return;
    }

    setLoading(true);
    try {
      const payload = rows.map(row => ({
        name: row.name.trim(),
        category: row.category.trim() || undefined,
        dosage_form: row.dosage_form || undefined,
        manufacturer: row.manufacturer.trim() || undefined,
        buying_price: parseFloat(row.buying_price),
        // Pass retail price as legacy price if provided
        ...(row.retail_price && parseFloat(row.retail_price) > 0 ? {
          use_legacy_prices: true,
          retail_price: parseFloat(row.retail_price),
          wholesale_price: parseFloat(row.retail_price) * 0.87, // ~WS is 87% of SP
        } : {}),
        stock_quantity: parseInt(row.stock_quantity) || 0,
        expiry_date: row.expiry_date || undefined,
      }));

      const response = await api.post('/products/bulk-create/', payload, {
        skipGlobalErrorNotification: true,
      });

      const count = response.data?.data?.created_count ?? rows.length;
      notify.success(
        'Medicines Added',
        `${count} medicine${count !== 1 ? 's' : ''} added to the system successfully.`,
      );
      onSuccess?.();
      // Reset and close
      setRows([EMPTY_ROW()]);
      setRowErrors({});
      onClose();
    } catch (err) {
      // Show per-row backend errors if available
      const details = err?.response?.data?.data?.details;
      if (details?.length) {
        const newErrs = {};
        details.forEach(({ index, errors: fieldErrors }) => {
          const row = rows[index];
          if (row) newErrs[row.id] = fieldErrors;
        });
        if (Object.keys(newErrs).length) setRowErrors(newErrs);
      }
      notifyApiError(notify, err, 'Bulk Add Failed', 'Could not save all medicines. Please check the highlighted rows.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const cellInput = (id, field, props) => {
    const hasError = !!rowErrors[id]?.[field];
    return (
      <input
        {...props}
        className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-all ${
          hasError
            ? 'border-rose-400 bg-rose-50 ring-rose-500/20 focus:ring-rose-500/30'
            : 'border-slate-200 bg-white focus:ring-primary/20 focus:border-indigo-400'
        }`}
        title={rowErrors[id]?.[field] ?? undefined}
      />
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl bg-white rounded-[2rem] shadow-premium overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Bulk Add Medicines</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Add multiple new medicines to the system at once.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="p-8 overflow-y-auto flex-1">
          <form id="bulkAddMedicineForm" onSubmit={handleSubmit}>

            {/* Row controls */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Medicines</h3>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full uppercase tracking-widest">
                  {rows.length} {rows.length === 1 ? 'row' : 'rows'}
                </span>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" /> Add Row
              </button>
            </div>

            {/* Helper note */}
            <p className="text-[11px] text-slate-400 font-medium mb-4">
              Fields marked <span className="text-rose-500 font-bold">*</span> are required. 
              If no Retail Price is entered, it will be auto-calculated as BP × 1.33.
            </p>

            {/* Table */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ minWidth: '1000px' }}>
                  <thead className="bg-slate-100/70 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-56">
                        Name <span className="text-rose-500">*</span>
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-40">Category</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-36">Dosage Form</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-36">Manufacturer</th>
                      <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-28">
                        Buy Price <span className="text-rose-500">*</span>
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-28">
                        Retail Price
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">
                        Init Stock <span className="text-rose-500">*</span>
                      </th>
                      <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32">Expiry</th>
                      <th className="px-3 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row) => (
                      <tr key={row.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                        {/* Name */}
                        <td className="px-3 py-2">
                          {cellInput(row.id, 'name', {
                            type: 'text',
                            value: row.name,
                            onChange: e => updateRow(row.id, 'name', e.target.value),
                            placeholder: 'e.g. Paracetamol 500mg',
                          })}
                          {rowErrors[row.id]?.name && (
                            <p className="text-rose-500 text-[10px] mt-0.5 font-bold">{rowErrors[row.id].name}</p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="px-3 py-2">
                          {categories.length > 0 ? (
                            <select
                              value={row.category}
                              onChange={e => updateRow(row.id, 'category', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                              <option value="">Select…</option>
                              {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={row.category}
                              onChange={e => updateRow(row.id, 'category', e.target.value)}
                              placeholder="Category"
                              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          )}
                        </td>

                        {/* Dosage Form */}
                        <td className="px-3 py-2">
                          <select
                            value={row.dosage_form}
                            onChange={e => updateRow(row.id, 'dosage_form', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            {DOSAGE_FORMS.map(d => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                        </td>

                        {/* Manufacturer */}
                        <td className="px-3 py-2">
                          {cellInput(row.id, 'manufacturer', {
                            type: 'text',
                            value: row.manufacturer,
                            onChange: e => updateRow(row.id, 'manufacturer', e.target.value),
                            placeholder: 'Optional',
                          })}
                        </td>

                        {/* Buying Price */}
                        <td className="px-3 py-2">
                          {cellInput(row.id, 'buying_price', {
                            type: 'number',
                            min: '0.01',
                            step: '0.01',
                            value: row.buying_price,
                            onChange: e => updateRow(row.id, 'buying_price', e.target.value),
                            placeholder: '0.00',
                          })}
                          {rowErrors[row.id]?.buying_price && (
                            <p className="text-rose-500 text-[10px] mt-0.5 font-bold">{rowErrors[row.id].buying_price}</p>
                          )}
                        </td>

                        {/* Retail Price */}
                        <td className="px-3 py-2">
                          {cellInput(row.id, 'retail_price', {
                            type: 'number',
                            min: '0.01',
                            step: '0.01',
                            value: row.retail_price,
                            onChange: e => updateRow(row.id, 'retail_price', e.target.value),
                            placeholder: 'Auto',
                          })}
                        </td>

                        {/* Initial Stock */}
                        <td className="px-3 py-2">
                          {cellInput(row.id, 'stock_quantity', {
                            type: 'number',
                            min: '0',
                            value: row.stock_quantity,
                            onChange: e => updateRow(row.id, 'stock_quantity', e.target.value),
                            placeholder: '0',
                          })}
                          {rowErrors[row.id]?.stock_quantity && (
                            <p className="text-rose-500 text-[10px] mt-0.5 font-bold">{rowErrors[row.id].stock_quantity}</p>
                          )}
                        </td>

                        {/* Expiry */}
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={row.expiry_date}
                            onChange={e => updateRow(row.id, 'expiry_date', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-600"
                          />
                        </td>

                        {/* Delete */}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length === 1}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick add more */}
            <button
              type="button"
              onClick={addRow}
              className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all text-sm font-bold flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4" /> Add another medicine
            </button>

          </form>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500 font-medium">
            <span className="font-bold text-slate-700">{rows.length}</span> medicine{rows.length !== 1 ? 's' : ''} to be added.
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 md:flex-none px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              form="bulkAddMedicineForm"
              type="submit"
              disabled={loading}
              className="flex-1 md:flex-none px-8 py-3.5 btn-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Saving…' : `Add ${rows.length} Medicine${rows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default BulkAddMedicineModal;
