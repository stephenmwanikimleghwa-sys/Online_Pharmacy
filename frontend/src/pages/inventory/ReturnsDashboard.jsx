import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import returnService from '../../services/returnService';
import api from '../../services/api';
import { ArrowUturnLeftIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../../context/NotificationContext';

const ReturnsDashboard = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);
  const [dispensationId, setDispensationId] = useState('');
  const [dispensation, setDispensation] = useState(null);
  
  const [returnItems, setReturnItems] = useState([]);
  const [reason, setReason] = useState('');

  const { data: returns, isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: returnService.getReturns
  });

  const fetchDispensation = async () => {
    if(!dispensationId) return;
    try {
      const res = await api.get(`/inventory/dispensations/${dispensationId}/`);
      setDispensation(res.data);
      // Initialize return items map
      const items = res.data.items.map(item => ({
        dispensation_item_id: item.id,
        name: item.product_name,
        max_quantity: item.quantity,
        price_per_unit: item.price_per_unit,
        quantity: 0,
        condition: 'sellable'
      }));
      setReturnItems(items);
    } catch(err) {
      notify.error('Not Found', 'That sale or dispensation could not be found.');
      setDispensation(null);
    }
  };

  const handleQuantityChange = (id, val) => {
    setReturnItems(items => items.map(it => 
      it.dispensation_item_id === id 
        ? { ...it, quantity: Math.min(Math.max(0, parseInt(val) || 0), it.max_quantity) }
        : it
    ));
  };

  const handleConditionChange = (id, val) => {
    setReturnItems(items => items.map(it => 
      it.dispensation_item_id === id ? { ...it, condition: val } : it
    ));
  };

  const createMutation = useMutation({
    mutationFn: returnService.createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries(['returns']);
      setShowNewModal(false);
      setDispensation(null);
      setDispensationId('');
      notify.success('Return Submitted', 'The return request is pending approval.');
    },
    onError: () => notify.error('Return Failed', 'Could not initiate this return.'),
  });

  const handleCreate = () => {
    const itemsToReturn = returnItems.filter(it => it.quantity > 0).map(it => ({
      dispensation_item_id: it.dispensation_item_id,
      quantity: it.quantity,
      refund_amount: it.quantity * it.price_per_unit,
      condition: it.condition
    }));

    if (itemsToReturn.length === 0) {
      notify.warning('No Items Selected', 'Select at least one item to return.');
      return;
    }
    if (!reason) {
      notify.warning('Reason Required', 'Please provide a reason for this return.');
      return;
    }

    createMutation.mutate({
      dispensation_id: dispensation.id,
      reason,
      items: itemsToReturn
    });
  };

  const approveMutation = useMutation({
    mutationFn: returnService.approveReturn,
    onSuccess: () => {
      queryClient.invalidateQueries(['returns']);
      notify.success('Return Approved', 'Stock and records have been updated.');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: returnService.rejectReturn,
    onSuccess: () => {
      queryClient.invalidateQueries(['returns']);
      notify.info('Return Rejected', 'The return request was rejected.');
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <ArrowUturnLeftIcon className="w-8 h-8 text-amber-500" />
            Returns & Refunds
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Manage reversed sales, refunds, and restocks.</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary bg-amber-500 hover:bg-amber-600 px-5 py-2.5 rounded-xl font-bold shadow-premium flex items-center gap-2">
          <PlusIcon className="w-5 h-5" /> Initiate Return
        </button>
      </div>

      <div className="glass-card rounded-[2rem] border border-white/60 shadow-premium p-6">
        {isLoading ? <div className="animate-pulse h-64 bg-slate-100 rounded-2xl"></div> : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Date</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Receipt #</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Refund</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Initiated By</th>
                <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns?.results?.map(ret => (
                <tr key={ret.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 text-sm font-medium">{new Date(ret.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-4 font-bold text-slate-800">#{ret.dispensation}</td>
                  <td className="px-4 py-4 text-sm font-bold text-rose-500">KSh {parseFloat(ret.total_refund).toFixed(2)}</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                      ${ret.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        ret.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {ret.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm">{ret.initiated_by_name}</td>
                  <td className="px-4 py-4 text-right flex justify-end gap-2">
                    {(user?.role === 'admin' || user?.role === 'manager') && ret.status === 'pending' && (
                      <>
                        <button onClick={() => approveMutation.mutate(ret.id)} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-2 rounded-lg" title="Approve & Restock">
                          <CheckIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => rejectMutation.mutate(ret.id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg" title="Reject">
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {returns?.results?.length === 0 && (
                <tr><td colSpan="6" className="text-center py-12 text-slate-400">No returns found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-premium max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Initiate Return</h3>
            
            {!dispensation ? (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1">Receipt Number (Dispensation ID)</label>
                <div className="flex gap-2">
                  <input type="number" className="form-input flex-1 rounded-xl" value={dispensationId} onChange={e => setDispensationId(e.target.value)} />
                  <button onClick={fetchDispensation} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold">Search</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100 flex justify-between items-center">
                  <div>
                    <div className="text-sm font-bold">Receipt #{dispensation.id}</div>
                    <div className="text-xs text-slate-500">{dispensation.patient_name || 'Walk-in'}</div>
                  </div>
                  <button onClick={() => setDispensation(null)} className="text-xs text-slate-500 underline">Change</button>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-bold mb-2">Select Items to Return</h4>
                  {returnItems.map(item => (
                    <div key={item.dispensation_item_id} className="flex gap-4 items-center bg-white border p-3 rounded-xl mb-2 shadow-sm">
                      <div className="flex-1 text-sm font-bold">{item.name} <span className="text-slate-400 font-normal">(@ KSh {item.price_per_unit})</span></div>
                      
                      <div className="w-24">
                        <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Return Qty</label>
                        <input type="number" min="0" max={item.max_quantity} className="form-input w-full text-sm rounded-lg" value={item.quantity} onChange={e => handleQuantityChange(item.dispensation_item_id, e.target.value)} />
                        <div className="text-[10px] text-slate-400 mt-1">Max: {item.max_quantity}</div>
                      </div>

                      <div className="w-32">
                         <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Condition</label>
                         <select className="form-input w-full text-sm rounded-lg" value={item.condition} onChange={e => handleConditionChange(item.dispensation_item_id, e.target.value)} disabled={item.quantity === 0}>
                           <option value="sellable">Sellable</option>
                           <option value="damaged">Damaged</option>
                         </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Reason for Return</label>
                  <textarea className="form-input w-full rounded-xl" rows="2" value={reason} onChange={e => setReason(e.target.value)}></textarea>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setShowNewModal(false)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
                  <button onClick={handleCreate} disabled={createMutation.isLoading} className="btn-primary bg-amber-500 hover:bg-amber-600 px-6 py-2 rounded-xl font-bold text-white shadow-md">Submit for Approval</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsDashboard;
