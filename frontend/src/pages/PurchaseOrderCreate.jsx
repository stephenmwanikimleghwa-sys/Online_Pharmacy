import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusIcon, TrashIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { createPurchaseOrder } from '../services/procurementService';
import LoadingButton from '../components/LoadingButton';

const emptyRow = () => ({
  id: Date.now() + Math.random(),
  product_id: '',
  quantity_ordered: '',
  estimated_unit_price: '',
});

const PurchaseOrderCreate = () => {
  const { user, activeBranch } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [prefillNote, setPrefillNote] = useState('');
  const [header, setHeader] = useState({
    supplier: '',
    expected_delivery: '',
    notes: '',
  });
  const [rows, setRows] = useState([emptyRow()]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'pharmacist') {
      navigate('/');
      return;
    }
    Promise.all([
      api.get('/inventory/suppliers/').then((r) => r.data?.results || r.data || []),
      api.get('/products/', { params: { context: 'inventory', page_size: 500 } }).then((r) =>
        r.data?.results || r.data?.data || r.data || []
      ),
    ]).then(([supplierList, productList]) => {
      setSuppliers(Array.isArray(supplierList) ? supplierList : []);
      setProducts(Array.isArray(productList) ? productList : []);
      setReady(true);
    });
  }, [user, navigate]);

  // Prefill from Supplier Intel "Order from …" links
  useEffect(() => {
    if (!ready) return;
    const supplier = searchParams.get('supplier') || '';
    const product = searchParams.get('product') || '';
    const qty = searchParams.get('qty') || '';
    const price = searchParams.get('price') || '';
    const reason = searchParams.get('reason') || '';
    const notes = searchParams.get('notes') || '';
    const intendedBranch = searchParams.get('branch') || '';

    if (!supplier && !product) return;

    setHeader((h) => ({
      ...h,
      supplier: supplier || h.supplier,
      notes:
        notes ||
        reason ||
        h.notes ||
        `Reorder — stock low at ${activeBranch?.name || 'branch'}`,
    }));

    if (product) {
      setRows([
        {
          id: Date.now() + Math.random(),
          product_id: String(product),
          quantity_ordered: qty || '50',
          estimated_unit_price: price || '',
        },
      ]);
    }

    const supplierName =
      (Array.isArray(suppliers) ? suppliers : []).find((s) => String(s.id) === String(supplier))
        ?.name || '';
    const productName =
      (Array.isArray(products) ? products : []).find((p) => String(p.id) === String(product))
        ?.name || '';

    const branchMismatch =
      intendedBranch &&
      activeBranch?.id &&
      String(intendedBranch) !== String(activeBranch.id);

    if (supplier || product) {
      setPrefillNote(
        [
          'Pre-filled from Restocks / Supplier Intel.',
          activeBranch?.name ? `Recording under branch: ${activeBranch.name}.` : '',
          branchMismatch
            ? 'Warning: this order was meant for a different branch — switch branch before submitting.'
            : '',
          supplierName ? `Supplier: ${supplierName}.` : '',
          productName ? `Product: ${productName}.` : '',
          reason || '',
        ]
          .filter(Boolean)
          .join(' '),
      );
    }
  }, [ready, searchParams, suppliers, products, activeBranch?.name, activeBranch?.id]);

  const totalEstimated = useMemo(
    () => rows.reduce((sum, row) => {
      const qty = parseFloat(row.quantity_ordered) || 0;
      const price = parseFloat(row.estimated_unit_price) || 0;
      return sum + qty * price;
    }, 0),
    [rows],
  );

  const updateRow = (id, field, value) => {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === 'product_id' && value) {
        const product = products.find((p) => p.id === parseInt(value, 10));
        if (product?.pricing_tier?.buying_price && !updated.estimated_unit_price) {
          updated.estimated_unit_price = product.pricing_tier.buying_price;
        }
      }
      return updated;
    }));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (id) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const intendedBranch = searchParams.get('branch') || '';
    if (
      intendedBranch &&
      activeBranch?.id &&
      String(intendedBranch) !== String(activeBranch.id)
    ) {
      notify.warning(
        'Wrong branch',
        `This restock is for another branch. Switch to that branch first, then create the order.`,
      );
      return;
    }
    if (!header.supplier) {
      notify.warning('Incomplete', 'Please select a supplier.');
      return;
    }
    const validRows = rows.filter((r) => r.product_id && parseFloat(r.quantity_ordered) > 0);
    if (validRows.length === 0) {
      notify.warning('Incomplete', 'Add at least one product with quantity.');
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
      <h1 className="text-2xl font-bold mb-2">New purchase order</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Order stock from a supplier. Fields may be filled in from Supplier Intel.
      </p>

      {prefillNote ? (
        <div
          className="mb-6 rounded-xl border p-4 flex gap-3 text-sm"
          style={{ background: 'var(--brand-mist)', borderColor: 'var(--brand-border-soft)' }}
          role="status"
        >
          <LightBulbIcon className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
          <p style={{ color: 'var(--text-primary)' }}>{prefillNote}</p>
        </div>
      ) : null}

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
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Order lines</h2>
            <button type="button" onClick={addRow} className="text-sm font-semibold text-primary flex items-center gap-1">
              <PlusIcon className="w-4 h-4" /> Add product
            </button>
          </div>
          <div className="overflow-x-auto border rounded-xl" style={{ borderColor: 'var(--border-primary)' }}>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase" style={{ background: 'var(--bg-field)', color: 'var(--text-secondary)' }}>
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 w-28">Qty</th>
                  <th className="px-3 py-2 w-32">Unit price</th>
                  <th className="px-3 py-2 w-28">Line total</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const lineTotal = (parseFloat(row.quantity_ordered) || 0) * (parseFloat(row.estimated_unit_price) || 0);
                  const productInList = products.some((p) => String(p.id) === String(row.product_id));
                  return (
                    <tr key={row.id} className="border-t" style={{ borderColor: 'var(--border-primary)' }}>
                      <td className="px-3 py-2">
                        <select
                          className="form-input w-full min-w-[200px]"
                          value={row.product_id}
                          onChange={(e) => updateRow(row.id, 'product_id', e.target.value)}
                          required
                        >
                          <option value="">Select product</option>
                          {!productInList && row.product_id ? (
                            <option value={row.product_id}>Product #{row.product_id}</option>
                          ) : null}
                          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          className="form-input w-full"
                          value={row.quantity_ordered}
                          onChange={(e) => updateRow(row.id, 'quantity_ordered', e.target.value)}
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-input w-full"
                          value={row.estimated_unit_price}
                          onChange={(e) => updateRow(row.id, 'estimated_unit_price', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap">
                        KES {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30"
                          disabled={rows.length <= 1}
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
            Total estimated cost: KES {totalEstimated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
