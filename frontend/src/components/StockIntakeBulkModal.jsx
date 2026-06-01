import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { notifyApiError } from '../utils/notifyApiError';
import LoadingButton from './LoadingButton';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const StockIntakeBulkModal = ({ isOpen, onClose, onSuccess, branches = [] }) => {
  const { notify } = useNotification();
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
      fetchProducts();
      // Initialize with one empty row
      setRows([{
        id: Date.now(),
        product_id: '',
        quantity_received: '',
        cost_price: '',
        selling_price: '',
        wholesale_price: '',
        expiry_date: '',
        batch_number: ''
      }]);
      // Reset main fields
      setSupplierId('');
      setBranchId(branches.length > 0 ? branches[0].id : '');
      setInvoiceNumber('');
      setPaymentStatus('PAID');
      setNotes('');
    }
  }, [isOpen, branches]);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/inventory/suppliers/');
      setSuppliers(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/');
      setProducts(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        id: Date.now(),
        product_id: '',
        quantity_received: '',
        cost_price: '',
        selling_price: '',
        wholesale_price: '',
        expiry_date: '',
        batch_number: ''
      }
    ]);
  };

  const removeRow = (id) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    
    // Auto-fill prices if product is selected
    if (field === 'product_id' && value) {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        setRows(prevRows => prevRows.map(r => r.id === id ? { 
          ...r, 
          product_id: value,
          cost_price: product.pricing_tier?.buying_price || '',
          selling_price: product.pricing_tier?.retail_price || product.price || '',
          wholesale_price: product.pricing_tier?.wholesale_price || ''
        } : r));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const missing = [];
    if (!supplierId) missing.push('Supplier');
    if (!branchId) missing.push('Branch');
    if (!invoiceNumber) missing.push('Invoice Number');
    if (missing.length) {
      notify.error(
        'Incomplete Information',
        `Please fill in all required fields: ${missing.join(', ')}.`,
      );
      return;
    }

    const validRows = rows.filter(r => r.product_id && r.quantity_received > 0);
    if (validRows.length === 0) {
      notify.warning(
        'No Products Added',
        'Add at least one product with quantity greater than 0.',
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        supplier_id: parseInt(supplierId),
        branch_id: parseInt(branchId),
        invoice_number: invoiceNumber,
        payment_status: paymentStatus,
        notes: notes,
        products: validRows.map(r => ({
          product_id: parseInt(r.product_id),
          quantity_received: parseInt(r.quantity_received),
          cost_price: parseFloat(r.cost_price) || 0,
          selling_price: parseFloat(r.selling_price) || 0,
          wholesale_price: parseFloat(r.wholesale_price) || 0,
          expiry_date: r.expiry_date || null,
          batch_number: r.batch_number || ''
        }))
      };

      const response = await api.post('/inventory/stock-intake/bulk/', payload, {
        skipGlobalErrorNotification: true,
      });
      notify.success(
        'Stock Received',
        response.data?.message || 'Stock intake was saved successfully.',
      );
      onSuccess();
      onClose();
    } catch (err) {
      notifyApiError(notify, err, 'Stock Intake Failed', 'Could not save stock intake. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return rows.reduce((total, row) => {
      const qty = parseInt(row.quantity_received) || 0;
      const cost = parseFloat(row.cost_price) || 0;
      return total + (qty * cost);
    }, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-6xl bg-white rounded-[2rem] shadow-premium overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">New Stock Intake</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Record a bulk delivery from a supplier and update inventory.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          <form id="bulkIntakeForm" onSubmit={handleSubmit}>
            
            {/* Invoice Meta Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 pb-8 border-b border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Branch *</label>
                <select
                  value={branchId}
                  onChange={e => setBranchId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Invoice # *</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                  placeholder="INV-XXXXX"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Status *</label>
                <select
                  value={paymentStatus}
                  onChange={e => setPaymentStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                >
                  <option value="PAID">Paid</option>
                  <option value="CREDIT">Credit</option>
                  <option value="PARTIAL">Partial</option>
                </select>
              </div>
            </div>

            {/* Products Section */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Products Received</h3>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 text-xs font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" /> Add Row
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="bg-slate-100/50">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-64">Product</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-24">Qty</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-28">Cost Price</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-28">Retail Price</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-28">WS Price</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32">Expiry</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-32">Batch #</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row) => (
                      <tr key={row.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2">
                          <select
                            value={row.product_id}
                            onChange={(e) => updateRow(row.id, 'product_id', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30"
                          >
                            <option value="">Select...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" min="1" value={row.quantity_received} onChange={(e) => updateRow(row.id, 'quantity_received', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30" placeholder="0" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" min="0" step="0.01" value={row.cost_price} onChange={(e) => updateRow(row.id, 'cost_price', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30" placeholder="0.00" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" min="0" step="0.01" value={row.selling_price} onChange={(e) => updateRow(row.id, 'selling_price', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30" placeholder="0.00" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="number" min="0" step="0.01" value={row.wholesale_price} onChange={(e) => updateRow(row.id, 'wholesale_price', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30" placeholder="0.00" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="date" value={row.expiry_date} onChange={(e) => updateRow(row.id, 'expiry_date', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30 text-slate-600" />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" value={row.batch_number} onChange={(e) => updateRow(row.id, 'batch_number', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary-500/30" placeholder="Batch" />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button type="button" onClick={() => removeRow(row.id)} className="text-slate-400 hover:text-red-500 transition-colors" disabled={rows.length === 1}>
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes / Comments</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 h-24"
                placeholder="Any additional notes about this delivery..."
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Invoice Cost:</span>
            <span className="text-2xl font-display font-bold text-slate-900">KES {calculateTotal().toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
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
              form="bulkIntakeForm"
              type="submit"
              disabled={loading}
              className="flex-1 md:flex-none px-8 py-3.5 btn-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              Confirm Intake
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StockIntakeBulkModal;
