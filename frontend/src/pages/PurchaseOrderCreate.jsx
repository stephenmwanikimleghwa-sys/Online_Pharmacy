import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, TrashIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { createPurchaseOrder } from '../services/procurementService';
import LoadingButton from '../components/LoadingButton';

const emptyRow = () => ({
  id: Date.now() + Math.random(),
  product_id: '',
  product_name: '',
  quantity_ordered: '',
  estimated_unit_price: '',
});

/* ─── Drug Search Autocomplete Row Cell ─────────────────────────────────────── */
const ProductSearch = ({ row, products, onSelect, onClear }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.generic_name?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [query, products]);

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(filtered[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = (product) => {
    setQuery('');
    setOpen(false);
    onSelect(product);
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[highlighted];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  if (row.product_id) {
    // Product already selected — show name chip with clear button
    return (
      <div className="flex items-center gap-2 min-w-[220px]">
        <span
          className="flex-1 text-sm font-medium truncate"
          style={{ color: 'var(--text-primary)' }}
          title={row.product_name}
        >
          {row.product_name}
        </span>
        <button
          type="button"
          onClick={onClear}
          title="Clear product"
          className="text-gray-400 hover:text-red-500 flex-shrink-0"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-w-[220px]">
      <div className="relative">
        <MagnifyingGlassIcon
          className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          className="form-input w-full pl-8 pr-3 text-sm"
          placeholder="Search drug…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlighted(0);
          }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>

      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 mt-1 w-full max-h-52 overflow-y-auto rounded-xl shadow-xl border"
          style={{
            background: 'var(--card-bg, #fff)',
            borderColor: 'var(--border-color, #e5e7eb)',
          }}
        >
          {filtered.map((p, i) => (
            <li
              key={p.id}
              className={`px-3 py-2 cursor-pointer text-sm flex flex-col gap-0.5 ${
                i === highlighted ? 'bg-indigo-50 text-indigo-700' : ''
              }`}
              style={i !== highlighted ? { color: 'var(--text-primary)' } : undefined}
              onMouseDown={() => handleSelect(p)}
              onMouseEnter={() => setHighlighted(i)}
            >
              <span className="font-medium truncate">{p.name}</span>
              {p.generic_name && (
                <span className="text-xs opacity-60 truncate">{p.generic_name}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && query.length >= 2 && filtered.length === 0 && (
        <div
          className="absolute z-50 left-0 mt-1 w-full rounded-xl shadow-xl border px-3 py-2 text-sm text-gray-400"
          style={{
            background: 'var(--card-bg, #fff)',
            borderColor: 'var(--border-color, #e5e7eb)',
          }}
        >
          No drugs found for "{query}"
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
const PurchaseOrderCreate = () => {
  const { user, activeBranch } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [header, setHeader] = useState({
    supplier: '',
    expected_delivery: '',
    notes: '',
  });
  const [rows, setRows] = useState([emptyRow()]);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'pharmacist') {
      navigate('/');
      return;
    }
    api.get('/inventory/suppliers/').then((r) => setSuppliers(r.data?.results || r.data || []));
    api.get('/products/', { params: { context: 'inventory', page_size: 500 } }).then((r) => {
      setProducts(r.data?.results || r.data?.data || r.data || []);
    });
  }, [user, navigate]);

  const totalEstimated = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const qty = parseFloat(row.quantity_ordered) || 0;
        const price = parseFloat(row.estimated_unit_price) || 0;
        return sum + qty * price;
      }, 0),
    [rows],
  );

  const selectProduct = useCallback((rowId, product) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const price =
          product?.pricing_tier?.buying_price ||
          product?.pricing_tier?.cost_price ||
          '';
        return {
          ...r,
          product_id: product.id,
          product_name: product.name,
          estimated_unit_price: price !== '' ? String(price) : r.estimated_unit_price,
        };
      }),
    );
  }, []);

  const clearProduct = useCallback((rowId) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id !== rowId ? r : { ...r, product_id: '', product_name: '', estimated_unit_price: '' },
      ),
    );
  }, []);

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => (r.id !== id ? r : { ...r, [field]: value })));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (id) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.supplier) {
      notify.warning('Incomplete', 'Please select a supplier.');
      return;
    }
    const validRows = rows.filter((r) => r.product_id && parseFloat(r.quantity_ordered) > 0);
    if (validRows.length === 0) {
      notify.warning('Incomplete', 'Add at least one drug with quantity.');
      return;
    }
    setLoading(true);
    try {
      await createPurchaseOrder({
        supplier: parseInt(header.supplier, 10),
        branch: activeBranch?.id,
        expected_delivery: header.expected_delivery || null,
        notes: header.notes || `Reorder — stock low at ${activeBranch?.name || 'branch'}`,
        items: validRows.map((r) => ({
          product: parseInt(r.product_id, 10),
          quantity_ordered: parseFloat(r.quantity_ordered),
          estimated_unit_price: parseFloat(r.estimated_unit_price) || 0,
        })),
      });
      notify.success('Created', `Purchase order created with ${validRows.length} product(s).`);
      navigate('/purchase-orders');
    } catch (err) {
      notify.error('Failed', err.response?.data?.message || 'Could not create PO.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-2">New Purchase Order</h1>
      <p className="text-sm text-gray-500 mb-6">
        Search for drugs and add them to this order. All items go to the same supplier.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 glass-card p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Supplier</label>
            <select
              className="form-input w-full"
              value={header.supplier}
              onChange={(e) => setHeader({ ...header, supplier: e.target.value })}
              required
            >
              <option value="">Select supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Expected delivery</label>
            <input
              type="date"
              className="form-input w-full"
              value={header.expected_delivery}
              onChange={(e) => setHeader({ ...header, expected_delivery: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="form-label">Notes</label>
          <textarea
            className="form-input w-full"
            rows={2}
            value={header.notes}
            onChange={(e) => setHeader({ ...header, notes: e.target.value })}
            placeholder={`Reorder — stock low at ${activeBranch?.name || 'branch'}`}
          />
        </div>

        {/* ─── Order Lines ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Order lines</h2>
            <button
              type="button"
              onClick={addRow}
              className="text-sm font-semibold text-indigo-600 flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" /> Add drug
            </button>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-sm">
              <thead
                className="text-left text-xs uppercase"
                style={{ background: 'var(--table-header-bg, #f9fafb)', color: 'var(--text-secondary)' }}
              >
                <tr>
                  <th className="px-3 py-2">Drug / Product</th>
                  <th className="px-3 py-2 w-28">Qty</th>
                  <th className="px-3 py-2 w-32">Unit price (KES)</th>
                  <th className="px-3 py-2 w-28">Line total</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const lineTotal =
                    (parseFloat(row.quantity_ordered) || 0) *
                    (parseFloat(row.estimated_unit_price) || 0);
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2">
                        <ProductSearch
                          row={row}
                          products={products}
                          onSelect={(p) => selectProduct(row.id, p)}
                          onClear={() => clearProduct(row.id)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          className="form-input w-full"
                          value={row.quantity_ordered}
                          onChange={(e) => updateRow(row.id, 'quantity_ordered', e.target.value)}
                          required={!!row.product_id}
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input w-full"
                          value={row.estimated_unit_price}
                          onChange={(e) =>
                            updateRow(row.id, 'estimated_unit_price', e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">
                        {lineTotal > 0
                          ? `KES ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30"
                          disabled={rows.length <= 1}
                          title="Remove row"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-right mt-3 font-bold">
            Total estimated cost:{' '}
            <span className="text-indigo-600">
              KES {totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>

        <LoadingButton type="submit" loading={loading} className="btn-primary w-full py-3 rounded-xl">
          Create purchase order
        </LoadingButton>
      </form>
    </div>
  );
};

export default PurchaseOrderCreate;
