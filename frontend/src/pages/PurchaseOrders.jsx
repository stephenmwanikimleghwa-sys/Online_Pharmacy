import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Transition, DialogBackdrop } from '@headlessui/react';
import {
  XCircleIcon,
  EnvelopeIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  listPurchaseOrders,
  markPurchaseOrderSent,
  cancelPurchaseOrder,
  sendPurchaseOrderToSupplier,
} from '../services/procurementService';
import LoadingButton from '../components/LoadingButton';

const statusColors = {
  DRAFT: 'bg-gray-200 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

/* ─── Send-to-Supplier split button ─────────────────────────────────────────── */
const SendButton = ({ po, onEmailSent }) => {
  const { notify } = useNotification();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(null); // 'email' | 'whatsapp' | null
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleEmail = async () => {
    setOpen(false);
    setSending('email');
    try {
      const res = await sendPurchaseOrderToSupplier(po.id, 'email');
      const to = res.data?.data?.to || res.data?.to || po.supplier_email || 'supplier';
      notify.success('Email Sent', `Purchase order emailed to ${to}.`);
      onEmailSent?.();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Could not send email. Check supplier email address.';
      notify.error('Email Failed', msg);
    } finally {
      setSending(null);
    }
  };

  const handleWhatsApp = async () => {
    setOpen(false);
    setSending('whatsapp');
    try {
      const res = await sendPurchaseOrderToSupplier(po.id, 'whatsapp');
      const url = res.data?.data?.whatsapp_url || res.data?.whatsapp_url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        notify.success('WhatsApp Opened', 'Order details pre-filled in WhatsApp. Send the message to the supplier.');
      } else {
        notify.error('WhatsApp Failed', 'Could not generate WhatsApp link.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'Could not generate WhatsApp link. Check supplier phone number.';
      notify.error('WhatsApp Failed', msg);
    } finally {
      setSending(null);
    }
  };

  const isLoading = Boolean(sending);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={isLoading}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
        title="Send to supplier"
      >
        {isLoading ? (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <EnvelopeIcon className="w-3.5 h-3.5" />
        )}
        Send
        <ChevronDownIcon className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 z-50 w-44 rounded-xl shadow-xl border overflow-hidden"
          style={{
            background: 'var(--card-bg, #fff)',
            borderColor: 'var(--border-color, #e5e7eb)',
          }}
        >
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-indigo-50 text-left transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onClick={handleEmail}
          >
            <EnvelopeIcon className="w-4 h-4 text-indigo-500" />
            Email supplier
          </button>
          <button
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-green-50 text-left transition-colors border-t"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-color, #e5e7eb)' }}
            onClick={handleWhatsApp}
          >
            <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-green-500" />
            WhatsApp supplier
          </button>
        </div>
      )}
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
const PurchaseOrders = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [cancelCandidate, setCancelCandidate] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listPurchaseOrders(statusFilter ? { status: statusFilter } : {});
      setOrders(res.data?.results || res.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'pharmacist') {
      navigate('/');
      return;
    }
    void load();
  }, [user, statusFilter, navigate, load]);

  const handleSent = async (id) => {
    try {
      await markPurchaseOrderSent(id);
      notify.success('Sent', 'Purchase order marked as sent.');
      void load();
    } catch {
      notify.error('Failed', 'Could not update order.');
    }
  };

  const confirmCancel = async () => {
    if (!cancelCandidate || !cancelReason.trim()) {
      notify.warning('Reason required', 'Please enter a cancellation reason.');
      return;
    }
    setCancelling(true);
    try {
      await cancelPurchaseOrder(cancelCandidate.id, cancelReason.trim());
      notify.success('Cancelled', 'Purchase order cancelled.');
      setCancelCandidate(null);
      setCancelReason('');
      void load();
    } catch {
      notify.error('Failed', 'Could not cancel order.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <button
          type="button"
          className="btn-primary px-4 py-2 rounded-lg"
          onClick={() => navigate('/purchase-orders/new')}
        >
          New Purchase Order
        </button>
      </div>

      <select
        className="form-input mb-4"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">All statuses</option>
        {Object.keys(statusColors).map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {loading ? (
        <p>Loading…</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-semibold mb-1">No purchase orders found</p>
          <p className="text-sm">Create one using the button above.</p>
        </div>
      ) : (
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
                  <td>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${statusColors[po.status]}`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td>{po.items?.length || 0}</td>
                  <td>KES {Number(po.total_estimated_cost).toLocaleString()}</td>
                  <td>{po.expected_delivery || '—'}</td>
                  <td>
                    <div className="flex items-center flex-wrap gap-2 whitespace-nowrap">
                      {/* Send to supplier — available for DRAFT and SENT orders */}
                      {(po.status === 'DRAFT' || po.status === 'SENT') && (
                        <SendButton po={po} onEmailSent={load} />
                      )}

                      {po.status === 'DRAFT' && (
                        <button
                          type="button"
                          className="text-blue-600 text-xs font-semibold hover:underline"
                          onClick={() => handleSent(po.id)}
                        >
                          Mark Sent
                        </button>
                      )}
                      {po.status === 'SENT' && (
                        <button
                          type="button"
                          className="text-green-600 text-xs font-semibold hover:underline"
                          onClick={() => navigate(`/purchase-orders/${po.id}/receive`)}
                        >
                          Receive Stock
                        </button>
                      )}
                      {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          className="text-red-600 text-xs font-semibold hover:underline"
                          onClick={() => {
                            setCancelReason('');
                            setCancelCandidate(po);
                          }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Cancel confirmation dialog ─── */}
      <Transition show={Boolean(cancelCandidate)} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-50 overflow-y-auto"
          onClose={() => !cancelling && setCancelCandidate(null)}
        >
          <div className="min-h-screen flex items-center justify-center px-4">
            <DialogBackdrop className="fixed inset-0 modal-overlay" />
            <div className="relative z-10 w-full max-w-md modal-card p-6 border-t-4 border-red-500">
              <h3
                className="text-lg font-bold mb-2 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <XCircleIcon className="h-6 w-6 text-red-500" />
                Cancel Purchase Order
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Cancel <strong>{cancelCandidate?.order_number}</strong>? This cannot be undone.
              </p>
              <label className="form-label">Reason for cancellation</label>
              <textarea
                className="form-input w-full mb-6"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Supplier out of stock, ordered elsewhere..."
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => {
                    setCancelCandidate(null);
                    setCancelReason('');
                  }}
                  className="form-cancel-btn px-4 py-2 rounded-xl"
                >
                  Keep Order
                </button>
                <LoadingButton
                  type="button"
                  loading={cancelling}
                  loadingText="Cancelling..."
                  onClick={confirmCancel}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
                >
                  Cancel Order
                </LoadingButton>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default PurchaseOrders;
