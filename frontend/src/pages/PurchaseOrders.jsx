import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  listPurchaseOrders,
  markPurchaseOrderSent,
  cancelPurchaseOrder,
} from '../services/procurementService';

const statusColors = {
  DRAFT: 'bg-gray-200 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const PurchaseOrders = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await listPurchaseOrders(statusFilter ? { status: statusFilter } : {});
      setOrders(res.data?.results || res.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'pharmacist') {
      navigate('/');
      return;
    }
    void load();
  }, [user, statusFilter, navigate]);

  const handleSent = async (id) => {
    try {
      await markPurchaseOrderSent(id);
      notify.success('Sent', 'Purchase order marked as sent.');
      void load();
    } catch {
      notify.error('Failed', 'Could not update order.');
    }
  };

  const handleCancel = async (id) => {
    const reason = window.prompt('Cancellation reason:');
    if (!reason) return;
    try {
      await cancelPurchaseOrder(id, reason);
      notify.success('Cancelled', 'Purchase order cancelled.');
      void load();
    } catch {
      notify.error('Failed', 'Could not cancel order.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <button type="button" className="btn-primary px-4 py-2 rounded-lg" onClick={() => navigate('/purchase-orders/new')}>
          New Purchase Order
        </button>
      </div>
      <select className="form-input mb-4" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All statuses</option>
        {Object.keys(statusColors).map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      {loading ? <p>Loading…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-gray-500">
                <th className="py-2">PO Number</th>
                <th>Supplier</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Products</th>
                <th>Est. Cost</th>
                <th>Expected</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-b">
                  <td className="py-3 font-mono">{po.order_number}</td>
                  <td>{po.supplier_name}</td>
                  <td>{po.branch_name}</td>
                  <td><span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColors[po.status]}`}>{po.status}</span></td>
                  <td>{po.items?.length || 0}</td>
                  <td>KES {Number(po.total_estimated_cost).toLocaleString()}</td>
                  <td>{po.expected_delivery || '—'}</td>
                  <td className="space-x-2">
                    {po.status === 'DRAFT' && (
                      <button type="button" className="text-blue-600 text-xs font-semibold" onClick={() => handleSent(po.id)}>Mark Sent</button>
                    )}
                    {po.status === 'SENT' && (
                      <button type="button" className="text-green-600 text-xs font-semibold" onClick={() => navigate(`/purchase-orders/${po.id}/receive`)}>Receive Stock</button>
                    )}
                    {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                      <button type="button" className="text-red-600 text-xs font-semibold" onClick={() => handleCancel(po.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
