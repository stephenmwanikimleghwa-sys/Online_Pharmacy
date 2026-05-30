import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { MagnifyingGlassIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const DispensingLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { token } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => { fetchLogs(); }, [currentPage, searchTerm, dateFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Use inventory stock logs endpoint (returns latest stock logs)
      let url = `${API_BASE_URL}/inventory/logs/`;
      if (searchTerm) url += `?search=${encodeURIComponent(searchTerm)}`;
      if (dateFilter) url += `${searchTerm ? '&' : '?'}created_at=${encodeURIComponent(dateFilter)}`;
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      // The backend returns an array of logs (no pagination)
      const data = Array.isArray(response.data) ? response.data : (response.data.results || []);
      setLogs(data);
      setTotalPages(Math.max(1, Math.ceil(data.length / 20)));
    } catch (error) {
      console.error('Error fetching dispensing logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => { setSearchTerm(e.target.value); setCurrentPage(1); };
  const handleDateFilter = (e) => { setDateFilter(e.target.value); setCurrentPage(1); };

  const headers = ["Product", "Qty", "Prev. Stock", "New Stock", "Total (KES)", "Dispensed By", "Date"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
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
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">No dispensing logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{log.product_name}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">{log.quantity}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">{log.previous_stock}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-500">{log.new_stock}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                      KES {Number(log.total_cost || 0).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                          {log.dispensed_by_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-slate-600">{log.dispensed_by_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-400">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
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