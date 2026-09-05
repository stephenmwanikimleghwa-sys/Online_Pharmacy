import React, { useState, useEffect } from 'react';
import inventoryService from '../services/inventoryService';
import api from '../services/api';
import SupplierPriceComparison from './SupplierPriceComparison';
import { getSupplierProducts, getSupplierScorecard, compareSupplierPrices } from '../services/procurementService';
import { useNotification } from '../context/NotificationContext';
import { notifyApiError } from '../utils/notifyApiError';
import { XMarkIcon, BanknotesIcon, PencilIcon, TrashIcon, ReceiptRefundIcon } from '@heroicons/react/24/outline';

const SupplierProfileModal = ({ supplier, onClose, onRefresh, onEdit, onDelete }) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState({ debt_transactions: [], purchase_history: [] });
  const [activeTab, setActiveTab] = useState('products');
  const [productsSupplied, setProductsSupplied] = useState([]);
  const [scorecard, setScorecard] = useState(null);
  const [compareProduct, setCompareProduct] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);

  // Payment Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Receipt State
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    fetchLedger();
    getSupplierProducts(supplier.id).then((res) => setProductsSupplied(res.data || [])).catch(() => setProductsSupplied([]));
  }, [supplier.id]);

  useEffect(() => {
    if (activeTab === 'products') {
      getSupplierProducts(supplier.id).then((res) => setProductsSupplied(res.data || [])).catch(() => setProductsSupplied([]));
    }
    if (activeTab === 'scorecard') {
      getSupplierScorecard(supplier.id).then((res) => setScorecard(res.data)).catch(() => setScorecard(null));
    }
  }, [activeTab, supplier.id]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/inventory/suppliers/${supplier.id}/ledger/`);
      setLedgerData(res.data);
    } catch (err) {
      notifyApiError(notify, err, "Could Not Load Ledger", "Supplier account history could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      notify.warning("Invalid Amount", "Please enter a valid positive payment amount.");
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await api.post(`/inventory/suppliers/${supplier.id}/record_payment/`, {
        amount: parseFloat(amount),
        payment_mode: paymentMode,
        invoice_number: invoiceNumber,
        notes: notes
      });
      
      notify.success(
        "Payment Recorded",
        `KES ${parseFloat(amount).toLocaleString()} paid to ${supplier.name}. Remaining balance: KES ${Number(res.data.new_balance).toLocaleString()}.`,
      );
      setReceiptData(res.data.receipt);
      setShowPaymentForm(false);
      
      // Update local state temporarily so UI reflects new balance
      supplier.balance = res.data.new_balance;
      
      fetchLedger();
      onRefresh();
      
    } catch (err) {
      notifyApiError(notify, err, "Payment Failed", "Could not record this payment.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const closeReceipt = () => {
    setReceiptData(null);
    setAmount('');
    setInvoiceNumber('');
    setNotes('');
  };

  const bal = parseFloat(supplier.balance);
  const isDebt = bal > 0; // We owe them
  const isCredit = bal < 0; // They owe us / store credit

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="absolute inset-0 modal-overlay" onClick={onClose}></div>
      <div
        className="relative w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)', borderRadius: 'var(--radius-surface)' }}
      >
        
        <div
          className="px-5 py-4 sm:px-6 flex items-center justify-between gap-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-primary)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm shrink-0"
              style={{ background: 'var(--color-primary)' }}
            >
              {supplier.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-display font-bold truncate" style={{ color: 'var(--text-primary)' }}>{supplier.name}</h2>
              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                Supplier intelligence · {supplier.contact_person || 'No contact'} · {supplier.phone || 'No phone'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {typeof onEdit === "function" ? (
              <button type="button" onClick={() => onEdit(supplier)} className="p-2 rounded-lg" style={{ color: "var(--color-primary)" }} title="Edit supplier">
                <PencilIcon className="w-5 h-5" />
              </button>
            ) : null}
            {typeof onDelete === "function" ? (
              <button type="button" onClick={() => onDelete(supplier.id)} className="p-2 rounded-lg text-rose-500" title="Delete supplier">
                <TrashIcon className="w-5 h-5" />
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="p-2 rounded-lg" style={{ color: "var(--text-secondary)" }} aria-label="Close">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row">
          
          <div
            className="w-full md:w-1/3 p-5 sm:p-6 flex flex-col gap-4"
            style={{ borderRight: '1px solid var(--border-primary)', background: 'var(--bg-field)' }}
          >
            
            <div
              className="p-4 rounded-xl border"
              style={{
                background: isDebt ? 'rgba(244,63,94,0.06)' : isCredit ? 'rgba(16,185,129,0.06)' : 'var(--bg-card)',
                borderColor: isDebt ? 'rgba(244,63,94,0.2)' : isCredit ? 'rgba(16,185,129,0.2)' : 'var(--border-primary)',
              }}
            >
              <p className="text-xs font-semibold mb-1.5" style={{ color: isDebt ? '#e11d48' : isCredit ? '#059669' : 'var(--text-secondary)' }}>
                {isDebt ? 'Outstanding payable' : isCredit ? 'Supplier credit' : 'Balance'}
              </p>
              <p className="text-2xl font-display font-bold" style={{ color: isDebt ? '#e11d48' : isCredit ? '#059669' : 'var(--text-primary)' }}>
                KES {Math.abs(bal).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </p>
            </div>

            {!showPaymentForm && !receiptData && (
              <button 
                type="button"
                onClick={() => setShowPaymentForm(true)}
                className="w-full py-2.5 btn-primary text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2"
              >
                <BanknotesIcon className="w-4 h-4" /> Record payment
              </button>
            )}

            {showPaymentForm && !receiptData && (
              <form onSubmit={handleRecordPayment} className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
                <h3 className="text-sm font-semibold pb-2" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)' }}>Pay supplier</h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Amount (KES)</label>
                  <input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm font-bold text-slate-700" placeholder="0.00" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Mode</label>
                  <select value={paymentMode} onChange={e=>setPaymentMode(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm font-bold text-slate-700">
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="MPESA">M-Pesa</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Reference / Invoice No</label>
                  <input type="text" value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm" placeholder="e.g. INV-2024-001" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Notes</label>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm h-16" placeholder="Optional notes..."></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors">Cancel</button>
                  <button type="submit" disabled={paymentLoading} className="flex-1 py-2 bg-primary hover:bg-primary-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50">
                    {paymentLoading ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </form>
            )}

            {/* Digital Receipt */}
            {receiptData && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 animate-scale-up text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ReceiptRefundIcon className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-900 mb-1">Payment Receipt</h3>
                <p className="text-xs text-slate-500 mb-4">{receiptData.supplier_name}</p>

                <div className="space-y-2 text-sm text-left bg-slate-50 p-4 rounded-xl mb-4">
                  <div className="flex justify-between"><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-800">{new Date(receiptData.timestamp).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Txn ID:</span> <span className="font-semibold text-slate-800">#{receiptData.transaction_id}</span></div>
                  {receiptData.invoice_number && <div className="flex justify-between"><span className="text-slate-500">Ref:</span> <span className="font-semibold text-slate-800">{receiptData.invoice_number}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-500">Mode:</span> <span className="font-semibold text-slate-800">{receiptData.payment_mode}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2"><span className="text-slate-500">Paid:</span> <span className="font-bold text-emerald-600">KES {parseFloat(receiptData.amount_paid).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Bal:</span> <span className="font-bold text-slate-800">KES {parseFloat(receiptData.remaining_balance).toLocaleString()}</span></div>
                </div>

                <button onClick={closeReceipt} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors">Done</button>
              </div>
            )}
          </div>

          <div className="w-full md:w-2/3 p-6 sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
              Supplier intelligence
            </p>
            <div className="flex flex-wrap gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
              {[
                { id: 'products', label: 'Products & prices' },
                { id: 'compare', label: 'Compare suppliers' },
                { id: 'scorecard', label: 'Scorecard' },
                { id: 'debt', label: 'Credit ledger' },
                { id: 'purchases', label: 'Purchases' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              {loading && activeTab !== 'products' && activeTab !== 'compare' && activeTab !== 'scorecard' ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : activeTab === 'debt' ? (
                ledgerData.debt_transactions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">No credit transactions recorded.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-xs font-bold text-slate-400 rounded-l-lg">Date</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400">Type / Ref</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400">Amount</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400 rounded-r-lg">Bal. After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerData.debt_transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-600">{new Date(tx.timestamp).toLocaleDateString()} <span className="text-xs text-slate-400">{new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${tx.type === 'PAYMENT' ? 'bg-emerald-100 text-emerald-700' : tx.type === 'PURCHASE_ON_CREDIT' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                              {tx.type.replace(/_/g, ' ')}
                            </span>
                            {tx.invoice_number && <p className="text-xs text-slate-500 mt-1 font-semibold">Ref: {tx.invoice_number}</p>}
                            {tx.description && <p className="text-xs text-slate-400 mt-0.5 max-w-[150px] truncate" title={tx.description}>{tx.description}</p>}
                          </td>
                          <td className={`px-4 py-3 font-bold text-sm ${tx.type === 'PAYMENT' ? 'text-emerald-600' : tx.type === 'PURCHASE_ON_CREDIT' ? 'text-rose-600' : 'text-slate-700'}`}>
                            {tx.type === 'PAYMENT' ? '-' : '+'}KES {parseFloat(tx.amount).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-semibold text-sm text-slate-800">KES {parseFloat(tx.balance_after).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : activeTab === 'purchases' ? (
                ledgerData.purchase_history.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">No purchases found. Record deliveries under Stock received to build history.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-xs font-bold text-slate-400 rounded-l-lg">Date</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400">Product</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400">Qty</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400">Total Cost</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-400 rounded-r-lg">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerData.purchase_history.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-600">{new Date(p.timestamp).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-xs font-semibold text-slate-700">{p.product_name}</td>
                          <td className="px-4 py-3 text-xs text-slate-600">{p.quantity}</td>
                          <td className="px-4 py-3 font-bold text-sm text-slate-800">KES {parseFloat(p.total_cost).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${p.payment_status === 'CREDIT' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {p.payment_status}
                            </span>
                            {p.invoice_number && <p className="text-xs text-slate-400 mt-1">Inv: {p.invoice_number}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : activeTab === 'products' ? (
                productsSupplied.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 space-y-2">
                    <p>No price history yet for this supplier.</p>
                    <p className="text-xs">Record deliveries in <strong>Stock received</strong> with a unit cost — intelligence builds from that.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-xs uppercase text-slate-400">
                        <th className="px-3 py-2">Product</th><th className="px-3 py-2">Last Price</th><th className="px-3 py-2">Last Date</th>
                        <th className="px-3 py-2">Times</th><th className="px-3 py-2">Avg</th><th className="px-3 py-2">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsSupplied.map((row) => (
                        <tr key={row.product_id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => setHistoryProduct(row)}>
                          <td className="px-3 py-2 font-medium">{row.product_name}</td>
                          <td className="px-3 py-2">KES {row.last_price}</td>
                          <td className="px-3 py-2">{row.last_date}</td>
                          <td className="px-3 py-2">{row.times_bought}</td>
                          <td className="px-3 py-2">KES {row.avg_price}</td>
                          <td className="px-3 py-2">{row.trend === 'RISING' ? '↑ Rising' : row.trend === 'FALLING' ? '↓ Falling' : '→ Stable'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : activeTab === 'compare' ? (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Pick a product to see which supplier sold it cheapest (uses Stock received history).
                  </p>
                  <select className="form-input w-full" value={compareProduct || ''} onChange={async (e) => {
                    const pid = e.target.value; setCompareProduct(pid);
                    if (pid) {
                      try {
                        const res = await compareSupplierPrices(pid);
                        setCompareData(res.data);
                      } catch {
                        setCompareData(null);
                      }
                    } else {
                      setCompareData(null);
                    }
                  }}>
                    <option value="">Select product to compare suppliers</option>
                    {productsSupplied.map((p) => <option key={p.product_id} value={p.product_id}>{p.product_name}</option>)}
                  </select>
                  {compareData && <SupplierPriceComparison data={compareData} />}
                  {!compareProduct && productsSupplied.length === 0 && (
                    <p className="text-sm text-slate-400">No products to compare yet for this supplier.</p>
                  )}
                </div>
              ) : activeTab === 'scorecard' ? (
                scorecard ? (
                  <div className="space-y-4 text-sm">
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      Overall: {scorecard.overall_score}/100
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Cheapest on {scorecard.products_cheapest} products · Potential monthly savings KES{' '}
                      {Number(scorecard.potential_monthly_savings || 0).toLocaleString()}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400">Loading scorecard…</div>
                )
              ) : (
                <div className="text-center py-10 text-slate-400">Select a tab.</div>
              )}
              {historyProduct && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl text-sm">
                  <h4 className="font-bold mb-2">Price history — {historyProduct.product_name}</h4>
                  <ul className="space-y-1">
                    {(historyProduct.price_history || []).map((h, i) => (
                      <li key={i}>{h.date}: KES {h.price}</li>
                    ))}
                  </ul>
                  <button type="button" className="mt-2 text-xs underline" onClick={() => setHistoryProduct(null)}>Close</button>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default SupplierProfileModal;
