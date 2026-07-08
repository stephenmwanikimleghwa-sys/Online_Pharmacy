import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { MagnifyingGlassIcon, ClipboardDocumentListIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import ReceiptModal from './ReceiptModal';

const DispensingLogs = () => {
  const { token, user, allowedBranches, activeBranch } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState(activeBranch?.id || 'all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reprintOrder, setReprintOrder] = useState(null);
  const [reprintLoading, setReprintLoading] = useState(null); // orderId being loaded

  useEffect(() => { fetchLogs(); }, [currentPage, searchTerm, dateFilter, branchFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (dateFilter) params.date = dateFilter;
      if (branchFilter && user?.role === 'admin') params.branch = branchFilter;
      if (currentPage > 1) params.page = currentPage;
      const response = await api.get('/inventory/dispensations/', { params, skipGlobalErrorNotification: true });
      const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setLogs(data);
      setTotalPages(Math.max(1, Math.ceil((response.data.count || data.length) / 20)));
    } catch (error) {
      } finally {
      setLoading(false);
    }
  };

  /* Fetch full order detail then open receipt modal */
  const handleReprint = async (orderId) => {
    setReprintLoading(orderId);
    try {
      const res = await api.get(`/inventory/dispensations/${orderId}/`);
      const order = res.data?.data ?? res.data;
      setReprintOrder(order);
    } catch {
      alert('Could not load order details. Please try again.');
    } finally {
      setReprintLoading(null);
    }
  };

  const handleSearch = (e) => { setSearchTerm(e.target.value); setCurrentPage(1); };
  const handleDateFilter = (e) => { setDateFilter(e.target.value); setCurrentPage(1); };
  const handleBranchFilter = (e) => { setBranchFilter(e.target.value); setCurrentPage(1); };

  const handleVoidSale = async (orderId) => {
    if (!window.confirm(`Are you sure you want to void sale #${orderId}? This will restore the stock and reverse any financials.`)) return;
    try {
      await api.post(`/inventory/dispensations/${orderId}/void_sale/`);
      alert(`Sale #${orderId} voided successfully.`);
      fetchLogs();
    } catch (error) {
      alert(`Could not void sale: ${error.response?.data?.error || error.message}`);
    }
  };

  const headers = ["Ref No", "Date", "Branch", "Staff", "Customer", "Items", "Total", "Payment Mode", "Actions"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Receipt reprint modal */}
      {reprintOrder && (
        <ReceiptModal order={reprintOrder} onClose={() => setReprintOrder(null)} />
      )}
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Dispensing Logs</h1>
        <p className="mt-1 text-slate-500">Complete history of all medicines dispensed through quick sales.</p>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder="Search by product name or notes..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 /30 focus:border-indigo-400 transition-all"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={handleDateFilter}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-700 focus:outline-none focus:ring-2 /30 focus:border-indigo-400 transition-all"
          />
          {user?.role === 'admin' && (
            <select
              value={branchFilter}
              onChange={handleBranchFilter}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-700 focus:outline-none focus:ring-2 /30 focus:border-indigo-400 transition-all"
            >
              <option value="all">All Branches</option>
              {allowedBranches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <ClipboardDocumentListIcon className="h-5 w-5 text-primary-500" />
          <h2 className="font-display font-bold text-slate-800">Dispensing Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                {headers.map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={headers.length} className="py-16 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="py-16 text-center text-slate-400 text-sm">No dispensing logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">
                      #{log.id}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">
                      {
                        (() => {
                          const dateStr = log.dispensed_at;
                          if (!dateStr) return '—';
                          const d = new Date(dateStr);
                          if (isNaN(d)) return String(dateStr);
                          try { return format(d, 'MMM d, yyyy HH:mm'); } catch (e) { return String(dateStr); }
                        })()
                      }
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">
                      {log.branch_name || '—'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                          {(log.dispensed_by_name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-600">{log.dispensed_by_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                      {log.sale_type === 'prescription' ? 'Prescription' : 'Walk-in'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">
                      {log.items?.length || 0} item(s)
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-800">
                      KES {Number(log.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                        {log.payment_mode || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-3 items-center">
                        {user?.role === 'admin' && (
                          <>
                            <button
                              className="text-primary hover:text-indigo-800 font-semibold transition-colors flex items-center gap-1 disabled:opacity-50"
                              disabled={reprintLoading === log.id}
                              onClick={() => handleReprint(log.id)}
                            >
                              <PrinterIcon className="w-4 h-4" />
                              {reprintLoading === log.id ? 'Loading...' : 'Reprint'}
                            </button>
                            {(!log.notes || !log.notes.includes('[VOIDED]')) && (
                              <button
                                className="text-rose-500 hover:text-rose-700 font-semibold transition-colors text-xs ml-2"
                                onClick={() => handleVoidSale(log.id)}
                              >
                                Void
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-400">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white shadow-[0_2px_10px_rgba(79,70,229,0.3)] hover:shadow-[0_4px_16px_rgba(79,70,229,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DispensingLogs;