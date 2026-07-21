import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useBranchParam } from '../hooks/useBranchParam';
import { PlusIcon, EyeIcon, InboxStackIcon, CubeIcon, BanknotesIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import StockIntakeBulkModal from '../components/StockIntakeBulkModal';
import StatCard from '../components/ui/StatCard';
import { PanelSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

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
            <h1 className="text-4xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Stock <span className="text-primary">received</span></h1>
          </div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
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
            { label: 'Deliveries', value: summary.total_records, accent: 'indigo', icon: InboxStackIcon },
            { label: 'Units received', value: summary.total_quantity_received, accent: 'emerald', icon: CubeIcon },
            { label: 'Total Cost', value: `KES ${parseFloat(summary.total_cost).toLocaleString()}`, accent: 'primary', icon: BanknotesIcon },
            { label: 'Suppliers', value: summary.distributors, accent: 'amber', icon: BuildingStorefrontIcon },
          ].map((stat, i) => (
            <StatCard
              key={i}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              accent={stat.accent}
              delayIndex={i + 1}
            />
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
      <div className="glass-card rounded-[2.5rem] border shadow-premium overflow-hidden" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="px-8 py-8 border-b flex flex-col md:flex-row justify-between items-center gap-6" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-field)' }}>
          <div className="relative group w-full md:w-96">
            <input
              type="text"
              placeholder="Search by supplier..."
              value={filterDistributor}
              onChange={(e) => setFilterDistributor(e.target.value)}
              className="form-input w-full pl-12 pr-6 py-3.5 rounded-2xl font-medium"
            />
            {!filterDistributor && (
              <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>All Records</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                {['Medicine / Product', 'Supplier', 'Quantity', 'Unit Price', 'Total Cost', 'Expiry Date', 'Actions'].map((header) => (
                  <th key={header} className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-8 py-8">
                    <PanelSkeleton rows={5} />
                  </td>
                </tr>
              ) : intakeRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-8 py-12">
                    <EmptyState icon={InboxStackIcon} title="No deliveries recorded yet" message="Recorded stock intakes will appear here." />
                  </td>
                </tr>
              ) : (
                intakeRecords.map((record) => (
                  <tr key={record.id} className="border-b last:border-0 transition-colors group" style={{ borderColor: 'var(--border-primary)' }}>
                    <td className="px-8 py-6">
                      <p className="font-bold group-hover:text-primary transition-colors" style={{ color: 'var(--text-primary)' }}>{record.product_name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-tight mt-0.5" style={{ color: 'var(--text-secondary)' }}>Batch: {record.batch_number || 'ST-ALPHA'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 border rounded-xl text-xs font-bold shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}>{record.distributor_name}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-lg font-display font-bold" style={{ color: 'var(--text-primary)' }}>{record.quantity_received}</p>
                      <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-secondary)' }}>Units</p>
                    </td>
                    <td className="px-8 py-6 font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>KES {parseFloat(record.unit_cost).toLocaleString()}</td>
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
                        className="w-10 h-10 border rounded-xl flex items-center justify-center hover:text-primary transition-all active:scale-90"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}
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
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedRecord(null)}></div>
          <div className="relative w-full max-w-lg glass-card rounded-[2rem] shadow-premium overflow-hidden border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="px-8 py-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
              <div>
                <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Intake Details</h2>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Recorded on {new Date(selectedRecord.received_date).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="transition-colors hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Product</label>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedRecord.product_name}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Supplier</label>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedRecord.supplier_name || selectedRecord.distributor_name}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Quantity</label>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedRecord.quantity_received}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Unit Cost</label>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>KES {parseFloat(selectedRecord.unit_cost).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Total Cost</label>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>KES {parseFloat(selectedRecord.total_cost).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Batch / Expiry</label>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selectedRecord.batch_number || 'N/A'} <br/>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Exp: {selectedRecord.expiry_date || 'N/A'}</span>
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Invoice Number</label>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedRecord.invoice_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Payment Status</label>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedRecord.payment_status}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Received By</label>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedRecord.received_by_username || 'System'}</p>
                </div>
              </div>
              {selectedRecord.notes && (
                <div className="pt-6 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)' }}>Notes</label>
                  <p className="text-sm p-4 rounded-xl" style={{ color: 'var(--text-secondary)', background: 'var(--bg-field)' }}>{selectedRecord.notes}</p>
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
