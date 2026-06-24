import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBranchParam } from '../hooks/useBranchParam';
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import StockIntakeBulkModal from '../components/StockIntakeBulkModal';

const StockIntakeLog = () => {
  const { user, activeBranch } = useAuth();
  const { branchParams } = useBranchParam();
  const [intakeRecords, setIntakeRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterDistributor, setFilterDistributor] = useState('');
  const [summary, setSummary] = useState(null);

  // We fetch branches to pass to the modal
  const [branches, setBranches] = useState([]);

  // Fetch stock intake records
  useEffect(() => {
    fetchIntakeRecords();
    fetchSummary();
    fetchBranches();
  }, [filterDistributor, activeBranch]);

  const fetchBranches = async () => {
    try {
      const response = await api.get('/auth/branches/');
      setBranches(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      }
  };

  const fetchIntakeRecords = async () => {
    try {
      setLoading(true);
      const params = { ...branchParams };
      if (filterDistributor) params.distributor = filterDistributor;
      const response = await api.get('/inventory/stock-intake/', { params });
      setIntakeRecords(Array.isArray(response.data) ? response.data : response.data.results || []);
      setError(null);
    } catch (err) {
      setError('Could not load deliveries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/inventory/stock-intake/summary/', { params: branchParams });
      setSummary(response.data);
    } catch (err) {
      }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'pharmacist')) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Access Denied</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Only admins and pharmacists can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header Section */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-glow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Stock <span className="text-primary">received</span></h1>
          </div>
          <p className="text-lg text-slate-500 font-medium">
            Use this page to record new deliveries. This helps you track what came in, who supplied it, cost, batch number, and expiry date.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3.5 btn-primary text-white rounded-2xl  shadow-premium hover:shadow-glow transition-all active:scale-[0.98] flex items-center gap-2 group"
        >
          <PlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest leading-none mt-0.5">Add a delivery</span>
        </button>
      </div>

      {/* Summary Cards Bento */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Deliveries', value: summary.total_records, color: 'indigo', icon: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
            { label: 'Units received', value: summary.total_quantity_received, color: 'emerald', icon: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
            { label: 'Total Cost', value: `KES ${parseFloat(summary.total_cost).toLocaleString()}`, color: 'violet', icon: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
            { label: 'Suppliers', value: summary.distributors, color: 'amber', icon: (props) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
          ].map((stat, i) => (
            <div key={i} className="glass-card rounded-3xl p-6 shadow-premium border border-white/60 hover:shadow-soft transition-all group">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-10 h-10 bg-${stat.color}-50 rounded-xl flex items-center justify-center text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
              <p className="text-2xl font-display font-bold text-slate-900 break-words">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 animate-shake">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="text-rose-900 font-bold text-sm tracking-tight">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>
        </div>
      )}

      {/* Controls & Table Container */}
      <div className="glass-card rounded-[2.5rem] border border-white/60 shadow-premium overflow-hidden">
        <div className="px-8 py-8 border-b border-slate-100 bg-white/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="relative group w-full md:w-96">
            <input
              type="text"
              placeholder="Search by supplier..."
              value={filterDistributor}
              onChange={(e) => setFilterDistributor(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-slate-50/50 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-4 /10 focus:border-indigo-500 focus:bg-white transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-sm"
            />
            {!filterDistributor && (
              <svg className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-100 rounded-full">All Records</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                {['Medicine / Product', 'Supplier', 'Quantity', 'Unit Price', 'Total Cost', 'Expiry Date', 'Actions'].map((header) => (
                  <th key={header} className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-xl animate-spin shadow-glow-indigo"></div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : intakeRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-slate-500 font-display font-bold">No deliveries recorded yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                intakeRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{record.product_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">Batch: {record.batch_number || 'ST-ALPHA'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 shadow-sm">{record.distributor_name}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-display font-bold text-slate-900">{record.quantity_received}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Units</p>
                    </td>
                    <td className="px-8 py-6 font-medium text-slate-600 text-sm">KES {parseFloat(record.unit_cost).toLocaleString()}</td>
                    <td className="px-8 py-6">
                      <p className="font-display font-bold text-primary">KES {parseFloat(record.total_cost).toLocaleString()}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${record.expiry_date && new Date(record.expiry_date) < new Date()
                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                        {record.expiry_date ? new Date(record.expiry_date).toLocaleDateString() : 'Infinite'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:border-indigo-100 hover:shadow-card transition-all active:scale-90"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock intake modal */}
      {isModalOpen && (
        <StockIntakeBulkModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          branches={branches}
          onSuccess={() => {
            fetchIntakeRecords();
            fetchSummary();
          }}
        />
      )}

      {/* Record Detail Modal - Premium Design */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedRecord(null)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-premium overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-bold text-slate-900">Intake Details</h2>
                <p className="text-sm text-slate-500 font-medium">Recorded on {new Date(selectedRecord.received_date).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Product</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.product_name}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Supplier</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.supplier_name || selectedRecord.distributor_name}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantity</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.quantity_received}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Unit Cost</label>
                  <p className="font-semibold text-slate-800">KES {parseFloat(selectedRecord.unit_cost).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Cost</label>
                  <p className="font-semibold text-slate-800">KES {parseFloat(selectedRecord.total_cost).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Batch / Expiry</label>
                  <p className="font-semibold text-slate-800">
                    {selectedRecord.batch_number || 'N/A'} <br/>
                    <span className="text-slate-500 text-sm">Exp: {selectedRecord.expiry_date || 'N/A'}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Invoice Number</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.invoice_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Payment Status</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.payment_status}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Received By</label>
                  <p className="font-semibold text-slate-800">{selectedRecord.received_by_username || 'System'}</p>
                </div>
              </div>
              {selectedRecord.notes && (
                <div className="pt-6 border-t border-slate-100">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</label>
                  <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">{selectedRecord.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default StockIntakeLog;
