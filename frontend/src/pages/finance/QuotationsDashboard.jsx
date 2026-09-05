import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import quotationService from '../../services/quotationService';
import { useAuth } from '../../context/AuthContext';
import { DocumentPlusIcon, CheckCircleIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../../context/NotificationContext';
import { notifyApiError } from '../../utils/notifyApiError';
import BranchSelector from '../../components/BranchSelector';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';

const CreateQuotationModal = ({ isOpen, onClose }) => {
  const { notify } = useNotification();
  const { user, activeBranch } = useAuth();
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [branchId, setBranchId] = useState(activeBranch?.id || user?.branch?.id || '');
  const [items, setItems] = useState([]);

  React.useEffect(() => {
    const next = activeBranch?.id || user?.branch?.id || '';
    if (next) setBranchId(next);
  }, [activeBranch?.id, user?.branch?.id]);
  
  // Search products via inventory list (catalog for active/selected branch)
  const [searchTerm, setSearchTerm] = useState('');
  const { data: searchResults, isFetching: searchingCatalog } = useQuery({
    queryKey: ['quotationProducts', searchTerm, branchId],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return { results: [] };
      const res = await api.get('/inventory/list/', {
        params: {
          search: searchTerm,
          branch: branchId || undefined,
          per_page: 40,
          scope: 'local',
        },
        skipGlobalErrorNotification: true,
      });
      const products = res.data?.products || res.data?.results || res.data?.data || [];
      return {
        results: (Array.isArray(products) ? products : []).map((p) => ({
          id: p.id,
          product: {
            id: p.id,
            name: p.name,
            price: p.selling_price ?? p.price ?? 0,
          },
          quantity: p.stock_quantity ?? p.quantity ?? 0,
        })),
      };
    },
    enabled: searchTerm.length >= 2,
  });

  const addItem = (row) => {
    const productId = row.product?.id || row.id;
    const unitPrice = Number(row.product?.price || 0);
    const name = row.product?.name || row.name;
    
    const existing = items.find(i => i.product === productId);
    if (existing) {
      setItems(items.map(i => i.product === productId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { product: productId, name, quantity: 1, unit_price: unitPrice }]);
    }
    setSearchTerm('');
  };

  const removeItem = (id) => {
    setItems(items.filter(i => i.product !== id));
  };

  const updateQuantity = (id, q) => {
    setItems(items.map(i => i.product === id ? { ...i, quantity: parseInt(q) || 1 } : i));
  };
  
  const updatePrice = (id, p) => {
    setItems(items.map(i => i.product === id ? { ...i, unit_price: parseFloat(p) || 0 } : i));
  };

  const createMutation = useMutation({
    mutationFn: quotationService.createQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries(['quotations']);
      notify.success('Quotation Created', 'The quotation was saved successfully.');
      onClose();
    },
    onError: (err) => notifyApiError(notify, err, 'Creation Failed', 'Could not create this quotation.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!branchId) {
      notify.warning('Branch required', 'Select a branch before creating the quotation.');
      return;
    }
    if (items.length === 0) {
      notify.warning('No Items', 'Add at least one item to the quotation.');
      return;
    }
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    createMutation.mutate({
      branch: branchId,
      customer_name: customerName,
      customer_phone: customerPhone,
      valid_until: validUntil.toISOString().slice(0, 10),
      items: items.map(i => ({ product: i.product, quantity: i.quantity, unit_price: i.unit_price }))
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-premium overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Create Quotation</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><XMarkIcon className="w-6 h-6 text-slate-500" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Customer Name *</label>
              <input required type="text" className="form-input w-full rounded-xl" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Customer Phone</label>
              <input type="text" className="form-input w-full rounded-xl" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>
            {user?.role === 'admin' && (
               <div className="md:col-span-2">
                 <label className="block text-xs font-bold text-slate-500 mb-1">Branch</label>
                 <BranchSelector onChange={b => setBranchId(b?.id || '')} />
               </div>
            )}
          </div>
          
          <div className="mb-6 relative">
             <label className="block text-xs font-bold text-slate-500 mb-1">Search Products</label>
             <input
               type="text"
               className="form-input w-full rounded-xl"
               placeholder="Type product name…"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               autoComplete="off"
             />
             {searchingCatalog && (
               <p className="text-xs text-slate-400 mt-1">Searching catalog…</p>
             )}
             {searchResults?.results?.length > 0 && (
               <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                 {searchResults.results.map(prod => (
                   <button
                     key={prod.id}
                     type="button"
                     onMouseDown={(e) => {
                       e.preventDefault();
                       addItem(prod);
                     }}
                     className="w-full text-left px-4 py-2 hover:bg-indigo-50 border-b border-slate-50 last:border-0 text-sm font-medium text-slate-700"
                   >
                     {prod.product.name}{' '}
                     <span className="text-slate-400 text-xs ml-2">Stock: {prod.quantity}</span>
                   </button>
                 ))}
               </div>
             )}
             {searchTerm.length >= 2 && !searchingCatalog && searchResults?.results?.length === 0 && (
               <p className="text-xs text-slate-400 mt-1">No matching products in this branch catalog.</p>
             )}
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden mb-6">
            <table className="w-full text-left">
               <thead className="bg-slate-50">
                 <tr>
                   <th className="px-4 py-2 text-xs text-slate-500">Product</th>
                   <th className="px-4 py-2 text-xs text-slate-500 w-24">Qty</th>
                   <th className="px-4 py-2 text-xs text-slate-500 w-32">Price (KES)</th>
                   <th className="px-4 py-2 text-xs text-slate-500 w-32 text-right">Subtotal</th>
                   <th className="px-4 py-2 text-xs text-slate-500 w-12"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {items.map(item => (
                   <tr key={item.product}>
                     <td className="px-4 py-2 text-sm font-medium">{item.name}</td>
                     <td className="px-4 py-2">
                       <input type="number" min="1" className="form-input w-full p-1 text-sm rounded-lg" value={item.quantity} onChange={e => updateQuantity(item.product, e.target.value)} />
                     </td>
                     <td className="px-4 py-2">
                       <input type="number" min="0" step="0.01" className="form-input w-full p-1 text-sm rounded-lg" value={item.unit_price} onChange={e => updatePrice(item.product, e.target.value)} />
                     </td>
                     <td className="px-4 py-2 text-sm text-right font-bold">{(item.quantity * item.unit_price).toLocaleString()}</td>
                     <td className="px-4 py-2 text-center">
                       <button type="button" onClick={() => removeItem(item.product)} className="text-rose-500 hover:text-rose-700"><XMarkIcon className="w-5 h-5"/></button>
                     </td>
                   </tr>
                 ))}
                 {items.length === 0 && (
                   <tr><td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-400">No items added</td></tr>
                 )}
               </tbody>
               <tfoot className="bg-slate-50">
                 <tr>
                   <td colSpan="3" className="px-4 py-3 text-right font-bold text-sm text-slate-600">Total:</td>
                   <td className="px-4 py-3 text-right font-bold text-lg text-primary">
                     {items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toLocaleString()}
                   </td>
                   <td></td>
                 </tr>
               </tfoot>
            </table>
          </div>
        </form>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={createMutation.isLoading || items.length === 0} className="btn-primary px-6 py-2 rounded-xl font-bold">Create Quotation</button>
        </div>
      </div>
    </div>
  );
};

const QuotationsDashboard = () => {
  const { notify } = useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['quotations', statusFilter],
    queryFn: () => quotationService.getQuotations(statusFilter ? { status: statusFilter } : {})
  });

  const convertMutation = useMutation({
    mutationFn: (id) => quotationService.convertToSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['quotations']);
      notify.success('Sale Complete', 'The quotation was converted to a sale.');
    },
    onError: (err) => {
      notifyApiError(notify, err, 'Conversion Failed', 'Could not convert this quotation to a sale.');
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <PageHeader
        title="Quotations"
        description="Create pro-forma invoices and convert them to sales."
        actions={
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-primary px-5 py-2.5 rounded-lg font-semibold text-sm"
          >
            New quotation
          </button>
        }
      />

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {['', 'draft', 'converted', 'expired'].map(status => (
          <button 
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${statusFilter === status ? 'btn-primary text-white' : ''}`}
            style={statusFilter === status ? {} : { background: 'var(--bg-field)', color: 'var(--text-secondary)' }}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-xl border p-4 sm:p-6 min-h-[50vh]" style={{ borderColor: 'var(--border-primary)' }}>
        {isLoading ? <div className="animate-pulse h-64 rounded-xl" style={{ background: 'var(--bg-field)' }}></div> : (
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>ID</th>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Customer</th>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Date</th>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: 'var(--text-secondary)' }}>Total (KES)</th>
                    <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quotations?.results?.map(q => (
                    <tr key={q.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-xs font-bold text-slate-500">#{q.id}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-700">{q.customer_name}</p>
                        <p className="text-xs text-slate-400">{q.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(q.created_at).toLocaleDateString()}
                        <p className="text-xs text-slate-400 mt-0.5">Valid to: {new Date(q.valid_until).toLocaleDateString()}</p>
                      </td>
                      <td className="px-4 py-3">
                         <span className={`px-2 py-1 rounded-full text-xs font-semibold
                            ${q.status === 'converted' ? 'bg-emerald-100 text-emerald-700' : 
                              q.status === 'expired' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                           {q.status}
                         </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-800">{parseFloat(q.total_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <button onClick={() => quotationService.exportPDF(q.id)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Download PDF">
                             <ArrowDownTrayIcon className="w-5 h-5" />
                           </button>
                           {q.status !== 'converted' && q.status !== 'expired' && (
                              <button 
                                onClick={() => {
                                  if(window.confirm('Convert this quotation to an actual sale? This will deduct stock.')) {
                                    convertMutation.mutate(q.id);
                                  }
                                }} 
                                disabled={convertMutation.isLoading}
                                className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Convert to Sale">
                                <CheckCircleIcon className="w-5 h-5" />
                              </button>
                           )}
                         </div>
                      </td>
                    </tr>
                  ))}
                  {quotations?.results?.length === 0 && (
                    <tr><td colSpan="6" className="text-center py-12 text-slate-400">No quotations found.</td></tr>
                  )}
                </tbody>
             </table>
           </div>
        )}
      </div>
      
      <CreateQuotationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default QuotationsDashboard;
