import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import reportsHubService from '../services/reportsHubService';
import { useAuth } from '../context/AuthContext';
import BranchSelector from '../components/BranchSelector';
import { utils, writeFile } from 'xlsx';
import { DocumentTextIcon, ChartBarIcon, CurrencyDollarIcon, UserGroupIcon, CalendarDaysIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

const ReportsDashboard = () => {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState('sales');
  
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    branchId: user?.branch?.id || '',
    staffId: '',
    productId: '',
    days: 90
  });

  const { data: salesData, isLoading: loadingSales, error: salesError, refetch: refetchSales } = useQuery({
    queryKey: ['salesReport', filters],
    queryFn: () => reportsHubService.getSalesReport({
      start_date: filters.startDate,
      end_date: filters.endDate,
      branch_id: filters.branchId,
      staff_id: filters.staffId,
      product_id: filters.productId
    }),
    enabled: activeReport === 'sales'
  });

  const { data: valuationData, isLoading: loadingValuation, error: valuationError, refetch: refetchValuation } = useQuery({
    queryKey: ['stockValuation', filters.branchId],
    queryFn: () => reportsHubService.getStockValuation({ branch_id: filters.branchId }),
    enabled: activeReport === 'valuation'
  });

  const { data: expiryData, isLoading: loadingExpiry, error: expiryError, refetch: refetchExpiry } = useQuery({
    queryKey: ['expiryReport', filters.days],
    queryFn: () => reportsHubService.getExpiryReport({ days: filters.days }),
    enabled: activeReport === 'expiry'
  });

  const { data: staffData, isLoading: loadingStaff, error: staffError, refetch: refetchStaff } = useQuery({
    queryKey: ['staffActivity', filters],
    queryFn: () => reportsHubService.getStaffActivity({
      start_date: filters.startDate,
      end_date: filters.endDate
    }),
    enabled: activeReport === 'staff'
  });

  const handleExportCSV = () => {
    let dataToExport = [];
    let filename = 'report.xlsx';

    if (activeReport === 'sales') {
      dataToExport = salesData?.sales || [];
      filename = `sales_report_${filters.startDate}_to_${filters.endDate}.xlsx`;
    } else if (activeReport === 'valuation') {
      dataToExport = valuationData?.valuation || [];
      filename = 'stock_valuation.xlsx';
    } else if (activeReport === 'expiry') {
      dataToExport = expiryData?.expiry || [];
      filename = 'expiry_report.xlsx';
    } else if (activeReport === 'staff') {
      dataToExport = staffData?.activity || [];
      filename = `staff_activity_${filters.startDate}_to_${filters.endDate}.xlsx`;
    }

    const ws = utils.json_to_sheet(dataToExport);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Report Data");
    writeFile(wb, filename);
  };

  const reports = [
    { id: 'sales', label: 'Sales Report', icon: ChartBarIcon },
    { id: 'valuation', label: 'Stock Valuation', icon: CurrencyDollarIcon },
    { id: 'expiry', label: 'Expiry Report', icon: CalendarDaysIcon },
    { id: 'staff', label: 'Staff Activity', icon: UserGroupIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <DocumentTextIcon className="w-8 h-8 text-primary" />
            Reports Hub
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Generate and export master reports.</p>
        </div>
        <button onClick={handleExportCSV} className="btn-primary px-4 py-2.5 rounded-xl font-bold text-sm shadow-premium flex items-center gap-2">
          <ArrowDownTrayIcon className="w-5 h-5" /> Export as Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {reports.map(rep => {
          const Icon = rep.icon;
          const isActive = activeReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id)}
              className={`p-6 rounded-3xl text-left border transition-all ${isActive ? 'bg-primary border-primary text-white shadow-card transform scale-[1.02]' : 'bg-white border-slate-100 hover:border-primary/30 hover:shadow-sm text-slate-700'}`}
            >
              <Icon className={`w-8 h-8 mb-4 ${isActive ? 'text-white' : 'text-primary'}`} />
              <h3 className="font-bold text-lg">{rep.label}</h3>
            </button>
          )
        })}
      </div>

      <div className="glass-card p-6 md:p-8 rounded-[2rem] border border-white/60 shadow-premium min-h-[50vh]">
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {(activeReport === 'sales' || activeReport === 'staff') && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Start Date</label>
                <input type="date" className="form-input rounded-xl text-sm" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">End Date</label>
                <input type="date" className="form-input rounded-xl text-sm" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
              </div>
            </>
          )}

          {(activeReport === 'sales' || activeReport === 'valuation') && user?.role === 'admin' && (
            <div className="w-48">
              <label className="block text-xs font-bold text-slate-500 mb-1">Branch</label>
              <BranchSelector onChange={b => setFilters({...filters, branchId: b?.id || ''})} />
            </div>
          )}

          {activeReport === 'expiry' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Expires within (days)</label>
              <input type="number" className="form-input rounded-xl text-sm w-32" value={filters.days} onChange={e => setFilters({...filters, days: e.target.value})} />
            </div>
          )}

          <div className="ml-auto">
             <button onClick={() => {
               if (activeReport === 'sales') refetchSales();
               if (activeReport === 'valuation') refetchValuation();
               if (activeReport === 'expiry') refetchExpiry();
               if (activeReport === 'staff') refetchStaff();
             }} className="btn-primary px-6 py-2 rounded-xl text-sm font-bold">Apply Filters</button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-x-auto">
          {activeReport === 'sales' && (
            salesError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
                <p className="text-rose-700 font-semibold">Failed to load sales report</p>
                <p className="text-rose-600 text-sm mt-1">{salesError?.message || 'Please try again later or contact support.'}</p>
                <button onClick={() => refetchSales()} className="btn-primary px-4 py-2 mt-4 rounded-lg text-sm">Retry</button>
              </div>
            ) : loadingSales ? <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div> : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Branch</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Staff</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Product</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Qty</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Subtotal (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesData?.sales?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-xs">{item.date}</td>
                      <td className="px-4 py-3 text-xs">{item.branch}</td>
                      <td className="px-4 py-3 text-xs font-semibold">{item.staff}</td>
                      <td className="px-4 py-3 text-sm">{item.product} <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{item.sale_type}</span></td>
                      <td className="px-4 py-3 text-sm text-right font-bold">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-primary">{parseFloat(item.subtotal).toLocaleString()}</td>
                    </tr>
                  ))}
                  {salesData?.sales?.length === 0 && (
                    <tr><td colSpan="6" className="text-center py-8 text-slate-400">No sales found.</td></tr>
                  )}
                </tbody>
              </table>
            )
          )}

          {activeReport === 'valuation' && (
            valuationError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
                <p className="text-rose-700 font-semibold">Failed to load stock valuation</p>
                <p className="text-rose-600 text-sm mt-1">{valuationError?.message || 'Please try again later or contact support.'}</p>
                <button onClick={() => refetchValuation()} className="btn-primary px-4 py-2 mt-4 rounded-lg text-sm">Retry</button>
              </div>
            ) : loadingValuation ? <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div> : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Product</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Branch</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Stock Qty</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Unit Cost</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Total Cost Val</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Retail Val</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {valuationData?.valuation?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">{item.product}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.branch}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-500">{parseFloat(item.buying_price).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-700">{parseFloat(item.cost_value).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">{parseFloat(item.retail_value).toLocaleString()}</td>
                    </tr>
                  ))}
                  {valuationData?.valuation?.length === 0 && (
                    <tr><td colSpan="6" className="text-center py-8 text-slate-400">No stock found.</td></tr>
                  )}
                </tbody>
              </table>
            )
          )}

          {activeReport === 'expiry' && (
            expiryError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
                <p className="text-rose-700 font-semibold">Failed to load expiry report</p>
                <p className="text-rose-600 text-sm mt-1">{expiryError?.message || 'Please try again later or contact support.'}</p>
                <button onClick={() => refetchExpiry()} className="btn-primary px-4 py-2 mt-4 rounded-lg text-sm">Retry</button>
              </div>
            ) : loadingExpiry ? <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div> : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Product</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Category</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Expiry Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiryData?.expiry?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">{item.product}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.category}</td>
                      <td className="px-4 py-3 text-sm">{item.expiry_date}</td>
                      <td className="px-4 py-3 text-xs font-bold">
                        <span className={`px-2 py-1 rounded-full ${item.days_until < 0 ? 'bg-rose-100 text-rose-700' : item.days_until <= 30 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {expiryData?.expiry?.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-8 text-slate-400">No products expiring in this timeframe.</td></tr>
                  )}
                </tbody>
              </table>
            )
          )}

          {activeReport === 'staff' && (
            staffError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
                <p className="text-rose-700 font-semibold">Failed to load staff activity</p>
                <p className="text-rose-600 text-sm mt-1">{staffError?.message || 'Please try again later or contact support.'}</p>
                <button onClick={() => refetchStaff()} className="btn-primary px-4 py-2 mt-4 rounded-lg text-sm">Retry</button>
              </div>
            ) : loadingStaff ? <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div> : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Staff Member</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Total Dispensations</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Revenue Handled (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffData?.activity?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-bold text-slate-700">{item.dispensed_by__username}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold">{item.total_sales}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-primary">{parseFloat(item.total_revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                  {staffData?.activity?.length === 0 && (
                    <tr><td colSpan="3" className="text-center py-8 text-slate-400">No activity found.</td></tr>
                  )}
                </tbody>
              </table>
            )
          )}

        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
