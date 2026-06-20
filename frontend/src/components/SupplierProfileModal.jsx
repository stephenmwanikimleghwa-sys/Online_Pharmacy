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
  const [activeTab, setActiveTab] = useState('debt');
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
      console.error("Error fetching ledger", err);
      notify.error("Could Not Load Ledger", "Supplier account history could not be loaded.");
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
      console.error(err);
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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-premium overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-primary flex items-center justify-center text-white font-display font-bold text-xl shadow-glow-indigo">
              {supplier.name[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-900">{supplier.name}</h2>
              <p className="text-sm text-slate-500 font-medium">Contact: {supplier.contact_person || 'N/A'} • {supplier.phone || 'No phone'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(supplier)} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-colors" title="Edit Supplier">
              <PencilIcon className="w-5 h-5" />
            </button>
            <button onClick={() => onDelete(supplier.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors" title="Delete Supplier">
              <TrashIcon className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2"></div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row">
          
          {/* Left Sidebar (Meta & Actions) */}
          <div className="w-full md:w-1/3 bg-slate-50/50 p-8 border-r border-slate-100 flex flex-col gap-6">
            
            <div className={`p-6 rounded-3xl border ${isDebt ? 'bg-rose-50 border-rose-100' : isCredit ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDebt ? 'text-rose-400' : isCredit ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isDebt ? 'Outstanding Payable' : isCredit ? 'Supplier Credit' : 'Current Balance'}
              </p>
              <p className={`text-3xl font-display font-bold ${isDebt ? 'text-rose-600' : isCredit ? 'text-emerald-600' : 'text-slate-900'}`}>
                KES {Math.abs(bal).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </p>
            </div>

            {!showPaymentForm && !receiptData && (
              <button 
                onClick={() => setShowPaymentForm(true)}
                className="w-full py-4 btn-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-premium hover:shadow-glow transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <BanknotesIcon className="w-5 h-5" /> Record Payment
              </button>
            )}

            {/* Payment Form */}
            {showPaymentForm && !receiptData && (
              <form onSubmit={handleRecordPayment} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-scale-up">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-2">Pay Supplier</h3>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount (KES)</label>
                  <input type="number" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm font-bold text-slate-700" placeholder="0.00" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mode</label>
                  <select value={paymentMode} onChange={e=>setPaymentMode(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm font-bold text-slate-700">
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="MPESA">M-Pesa</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference / Invoice No</label>
                  <input type="text" value={invoiceNumber} onChange={e=>setInvoiceNumber(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm" placeholder="e.g. INV-2024-001" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Notes</label>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/50 text-sm h-16" placeholder="Optional notes..."></textarea>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowPaymentForm(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">Cancel</button>
                  <button type="submit" disabled={paymentLoading} className="flex-1 py-2 bg-primary hover:bg-primary-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm transition-colors disabled:opacity-50">
                    {paymentLoading ? 'Saving...' : 'Confirm'}
                  </button>
                </div>
              </form>
            )}

            {/* Digital Receipt */}
            {receiptData && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-premium animate-scale-up text-center">
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

                <button onClick={closeReceipt} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors">Done</button>
              </div>
            )}
          </div>

          {/* Right Content (Ledger & Tabs) */}
          <div className="w-full md:w-2/3 p-8">
            <div className="flex border-b border-slate-200 mb-6">
              <button 
                onClick={() => setActiveTab('debt')} 
                className={`pb-4 px-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'debt' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Credit Ledger
              </button>
              <button onClick={() => setActiveTab('purchases')} className={`pb-4 px-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'purchases' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                Transactions
              </button>
              <button onClick={() => setActiveTab('products')} className={`pb-4 px-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                Products
              </button>
              <button onClick={() => setActiveTab('compare')} className={`pb-4 px-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'compare' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                Compare
              </button>
              <button onClick={() => setActiveTab('scorecard')} className={`pb-4 px-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'scorecard' ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                Scorecard
              </button>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
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
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest rounded-l-lg">Date</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type / Ref</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest rounded-r-lg">Bal. After</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerData.debt_transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-600">{new Date(tx.timestamp).toLocaleDateString()} <span className="text-[10px] text-slate-400">{new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${tx.type === 'PAYMENT' ? 'bg-emerald-100 text-emerald-700' : tx.type === 'PURCHASE_ON_CREDIT' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                              {tx.type.replace(/_/g, ' ')}
                            </span>
                            {tx.invoice_number && <p className="text-[10px] text-slate-500 mt-1 font-semibold">Ref: {tx.invoice_number}</p>}
                            {tx.description && <p className="text-[10px] text-slate-400 mt-0.5 max-w-[150px] truncate" title={tx.description}>{tx.description}</p>}
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
                  <div className="text-center py-10 text-slate-400">No purchases found.</div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest rounded-l-lg">Date</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Product</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Qty</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Cost</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest rounded-r-lg">Status</th>
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
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${p.payment_status === 'CREDIT' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {p.payment_status}
                            </span>
                            {p.invoice_number && <p className="text-[9px] text-slate-400 mt-1">Inv: {p.invoice_number}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : activeTab === 'products' ? (
                productsSupplied.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">No products supplied yet.</div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase text-slate-400">
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
                          <td className="px-3 py-2">{row.trend === 'RISING' ? '↑' : row.trend === 'FALLING' ? '↓' : '→'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : activeTab === 'compare' ? (
                <div className="space-y-4">
                  <select className="form-input w-full" value={compareProduct || ''} onChange={async (e) => {
                    const pid = e.target.value; setCompareProduct(pid);
                    if (pid) { const res = await compareSupplierPrices(pid); setCompareData(res.data); }
                  }}>
                    <option value="">Select product to compare suppliers</option>
                    {productsSupplied.map((p) => <option key={p.product_id} value={p.product_id}>{p.product_name}</option>)}
                  </select>
                  {compareData && <SupplierPriceComparison data={compareData} />}
                </div>
              ) : activeTab === 'scorecard' && scorecard ? (
                <div className="space-y-4 text-sm">
                  <p className="text-2xl font-bold">Overall: {scorecard.overall_score}/100</p>
                  <p>Cheapest on {scorecard.products_cheapest} products · Potential monthly savings KES {Number(scorecard.potential_monthly_savings).toLocaleString()}</p>
                </div>
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
