import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { createPurchaseOrder } from '../services/procurementService';
import LoadingButton from '../components/LoadingButton';

const PurchaseOrderCreate = () => {
  const { user, activeBranch } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    supplier: '',
    expected_delivery: '',
    notes: '',
    product_id: '',
    quantity_ordered: '',
    estimated_unit_price: '',
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier || !form.product_id || !form.quantity_ordered) {
      notify.warning('Incomplete', 'Supplier, product, and quantity are required.');
      return;
    }
    setLoading(true);
    try {
      await createPurchaseOrder({
        supplier: parseInt(form.supplier, 10),
        branch: activeBranch?.id,
        expected_delivery: form.expected_delivery || null,
        notes: form.notes || `Reorder — stock low at ${activeBranch?.name || 'branch'}`,
        items: [{
          product: parseInt(form.product_id, 10),
          quantity_ordered: parseFloat(form.quantity_ordered),
          estimated_unit_price: parseFloat(form.estimated_unit_price) || 0,
        }],
      });
      notify.success('Created', 'Purchase order created.');
      navigate('/purchase-orders');
    } catch (err) {
      notify.error('Failed', err.response?.data?.message || 'Could not create PO.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">New Purchase Order</h1>
      <form onSubmit={handleSubmit} className="space-y-4 glass-card p-6 rounded-2xl">
        <div>
          <label className="form-label">Supplier</label>
          <select className="form-input w-full" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} required>
            <option value="">Select supplier</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Product</label>
          <select className="form-input w-full" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
            <option value="">Select product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">Quantity</label>
            <input type="number" className="form-input w-full" value={form.quantity_ordered} onChange={(e) => setForm({ ...form, quantity_ordered: e.target.value })} required />
          </div>
          <div>
            <label className="form-label">Est. unit price (KES)</label>
            <input type="number" step="0.01" className="form-input w-full" value={form.estimated_unit_price} onChange={(e) => setForm({ ...form, estimated_unit_price: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="form-label">Expected delivery</label>
          <input type="date" className="form-input w-full" value={form.expected_delivery} onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })} />
        </div>
        <div>
          <label className="form-label">Notes</label>
          <textarea className="form-input w-full" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <LoadingButton type="submit" loading={loading} className="btn-primary w-full py-3 rounded-xl">Create PO</LoadingButton>
      </form>
    </div>
  );
};

export default PurchaseOrderCreate;
