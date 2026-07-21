import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import reportsHubService from '../services/reportsHubService';
import { useAuth } from '../context/AuthContext';
import BranchSelector from '../components/BranchSelector';
import { utils, writeFile } from 'xlsx';
import {
  DocumentTextIcon, ChartBarIcon, CurrencyDollarIcon,
  UserGroupIcon, CalendarDaysIcon, ArrowDownTrayIcon,
  ShoppingCartIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import EmptyState from '../components/ui/EmptyState';
import { PanelSkeleton } from '../components/ui/Skeleton';

const fmt = (n) => Number(n || 0).toLocaleString();

const ReportsDashboard = () => {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState('sales');
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    branchId: user?.branch?.id || '',
    staffId: '',
    productId: '',
    days: 90,
  });

  const { data: salesData, isLoading: loadingSales, error: salesError, refetch: refetchSales } = useQuery({
    queryKey: ['salesReport', filters],
    queryFn: () => reportsHubService.getSalesReport({ start_date: filters.startDate, end_date: filters.endDate, branch_id: filters.branchId, staff_id: filters.staffId, product_id: filters.productId }),
    enabled: activeReport === 'sales',
  });
  const { data: valuationData, isLoading: loadingValuation, error: valuationError, refetch: refetchValuation } = useQuery({
    queryKey: ['stockValuation', filters.branchId],
    queryFn: () => reportsHubService.getStockValuation({ branch_id: filters.branchId }),
    enabled: activeReport === 'valuation',
  });
  const { data: expiryData, isLoading: loadingExpiry, error: expiryError, refetch: refetchExpiry } = useQuery({
    queryKey: ['expiryReport', filters.days],
    queryFn: () => reportsHubService.getExpiryReport({ days: filters.days }),
    enabled: activeReport === 'expiry',
  });
  const { data: staffData, isLoading: loadingStaff, error: staffError, refetch: refetchStaff } = useQuery({
    queryKey: ['staffActivity', filters],
    queryFn: () => reportsHubService.getStaffActivity({ start_date: filters.startDate, end_date: filters.endDate }),
    enabled: activeReport === 'staff',
  });
  const { data: procurementData, isLoading: loadingProcurement, error: procurementError, refetch: refetchProcurement } = useQuery({
    queryKey: ['procurementAnalytics'],
    queryFn: () => reportsHubService.getProcurementAnalytics(),
    enabled: activeReport === 'procurement',
  });

  const handleExportCSV = () => {
    const map = {
      sales: [salesData?.sales || [], `sales_report_${filters.startDate}_to_${filters.endDate}.xlsx`],
      valuation: [valuationData?.valuation || [], 'stock_valuation.xlsx'],
      expiry: [expiryData?.expiry || [], 'expiry_report.xlsx'],
      staff: [staffData?.activity || [], `staff_activity_${filters.startDate}_to_${filters.endDate}.xlsx`],
      procurement: [procurementData?.potential_savings || [], 'procurement_savings.xlsx'],
    };
    const [data, filename] = map[activeReport] || [[], 'report.xlsx'];
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Report Data');
    writeFile(wb, filename);
  };

  const reports = [
    { id: 'sales', label: 'Sales Report', icon: ChartBarIcon },
    { id: 'valuation', label: 'Stock Valuation', icon: CurrencyDollarIcon },
    { id: 'expiry', label: 'Expiry Report', icon: CalendarDaysIcon },
    { id: 'procurement', label: 'Procurement Analytics', icon: ShoppingCartIcon },
    { id: 'staff', label: 'Staff Activity', icon: UserGroupIcon },
  ];

  const valuationRows = valuationData?.valuation || [];
  const totalStockValuation = valuationRows.reduce((sum, item) => sum + Number(item?.cost_value || 0), 0);

  const TH = ({ children, right }) => (
    <th className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider ${right ? 'text-right' : ''}`} style={{ color: 'var(--text-secondary)' }}>
      {children}
    </th>
  );
  const TR = ({ children, onClick }) => (
    <tr
      className="border-b last:border-0 transition-colors"
      style={{ borderColor: 'var(--border-primary)' }}
      onClick={onClick}
    >
      {children}
    </tr>
  );
  const TD = ({ children, right, bold, accent }) => (
    <td
      className={`px-4 py-3 text-sm ${right ? 'text-right' : ''} ${bold ? 'font-bold' : ''}`}
      style={{ color: accent ? 'var(--color-primary)' : 'var(--text-primary)' }}
    >
      {children}
    </td>
  );

  const ErrorPanel = ({ message, onRetry }) => (
    <EmptyState
      icon={ExclamationTriangleIcon}
      title="Failed to load report"
      message={message || 'Please try again later or contact support.'}
      tone="critical"
      action={<button type="button" className="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white" onClick={onRetry}>Retry</button>}
    />
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <DocumentTextIcon className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
            Reports Hub
          </h1>
          <p className="mt-1 font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>Generate and export master reports.</p>
        </div>
        <button onClick={handleExportCSV} className="btn-primary px-4 py-2.5 rounded-xl font-bold text-sm shadow-premium flex items-center gap-2 text-white">
          <ArrowDownTrayIcon className="w-5 h-5" /> Export as Excel
        </button>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {reports.map(rep => {
          const Icon = rep.icon;
          const isActive = activeReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id)}
              className={`p-5 rounded-2xl text-left border transition-all ${isActive ? 'btn-primary text-white shadow-glow scale-[1.02]' : 'glass-card hover:scale-[1.01]'}`}
              style={isActive ? {} : { borderColor: 'var(--border-primary)' }}
            >
              <Icon className={`w-7 h-7 mb-3 ${isActive ? 'text-white' : ''}`} style={isActive ? {} : { color: 'var(--color-primary)' }} />
              <h3 className="font-bold text-sm leading-tight">{rep.label}</h3>
            </button>
          );
        })}
      </div>

      {/* Main panel */}
      <div className="glass-card p-6 md:p-8 rounded-[2rem] border shadow-premium min-h-[50vh]" style={{ borderColor: 'var(--border-primary)' }}>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-end mb-8 p-4 rounded-2xl border" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
          {(activeReport === 'sales' || activeReport === 'staff') && (
            <>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Start Date</label>
                <input type="date" className="form-input rounded-xl text-sm" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>End Date</label>
                <input type="date" className="form-input rounded-xl text-sm" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
              </div>
            </>
          )}
          {(activeReport === 'sales' || activeReport === 'valuation') && user?.role === 'admin' && (
            <div className="w-48">
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Branch</label>
              <BranchSelector onChange={b => setFilters({ ...filters, branchId: b?.id || '' })} />
            </div>
          )}
          {activeReport === 'expiry' && (
            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Expires within (days)</label>
              <input type="number" className="form-input rounded-xl text-sm w-32" value={filters.days} onChange={e => setFilters({ ...filters, days: e.target.value })} />
            </div>
          )}
          <div className="ml-auto">
            <button onClick={() => {
              if (activeReport === 'sales') refetchSales();
              if (activeReport === 'valuation') refetchValuation();
              if (activeReport === 'expiry') refetchExpiry();
              if (activeReport === 'staff') refetchStaff();
              if (activeReport === 'procurement') refetchProcurement();
            }} className="btn-primary px-6 py-2 rounded-xl text-sm font-bold text-white">Apply Filters</button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-x-auto">

          {activeReport === 'sales' && (
            salesError ? <ErrorPanel message={salesError?.message?.includes('403') ? 'You do not have permission to view this report. Ask an admin to grant access.' : salesError?.message} onRetry={refetchSales} />
            : loadingSales ? <PanelSkeleton rows={6} />
            : salesData?.sales?.length === 0 ? <EmptyState icon={ChartBarIcon} title="No sales found" message="No sales match the selected filters." />
            : (
              <table className="w-full text-left">
                <thead><tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <TH>Date</TH><TH>Branch</TH><TH>Staff</TH><TH>Product</TH><TH right>Qty</TH><TH right>Subtotal (KES)</TH>
                </tr></thead>
                <tbody>
                  {salesData.sales.map(item => (
                    <TR key={item.id}>
                      <TD>{item.date}</TD>
                      <TD>{item.branch}</TD>
                      <TD bold>{item.staff}</TD>
                      <TD>
                        {item.product}
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'var(--brand-mist)', color: 'var(--color-primary)' }}>{item.sale_type}</span>
                      </TD>
                      <TD right bold>{item.quantity}</TD>
                      <TD right bold accent>{fmt(item.subtotal)}</TD>
                    </TR>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeReport === 'valuation' && (
            valuationError ? <ErrorPanel message={valuationError?.message} onRetry={refetchValuation} />
            : loadingValuation ? <PanelSkeleton rows={6} />
            : valuationData?.valuation?.length === 0 ? <EmptyState icon={CurrencyDollarIcon} title="No stock found" message="No stock valuation data for this branch." />
            : (
              <>
                <div className="mb-4 px-4 py-3 rounded-xl font-semibold text-sm" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
                  Total Stock Valuation: KES {fmt(totalStockValuation)}
                </div>
                <table className="w-full text-left">
                  <thead><tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                    <TH>Product</TH><TH>Branch</TH><TH right>Stock Qty</TH><TH right>Unit Cost</TH><TH right>Total Cost Val</TH><TH right>Retail Val</TH>
                  </tr></thead>
                  <tbody>
                    {valuationData.valuation.map((item, idx) => (
                      <TR key={idx}>
                        <TD bold>{item.product}</TD>
                        <TD>{item.branch}</TD>
                        <TD right bold>{item.quantity}</TD>
                        <TD right>{fmt(item.buying_price)}</TD>
                        <TD right bold>{fmt(item.cost_value)}</TD>
                        <TD right bold accent>{fmt(item.retail_value)}</TD>
                      </TR>
                    ))}
                  </tbody>
                </table>
              </>
            )
          )}

          {activeReport === 'expiry' && (
            expiryError ? <ErrorPanel message={expiryError?.message} onRetry={refetchExpiry} />
            : loadingExpiry ? <PanelSkeleton rows={5} />
            : expiryData?.expiry?.length === 0 ? <EmptyState icon={CalendarDaysIcon} title="No products expiring" message="No products expiring in this timeframe." tone="positive" />
            : (
              <table className="w-full text-left">
                <thead><tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <TH>Product</TH><TH>Category</TH><TH>Expiry Date</TH><TH>Status</TH>
                </tr></thead>
                <tbody>
                  {expiryData.expiry.map((item, idx) => (
                    <TR key={idx}>
                      <TD bold>{item.product}</TD>
                      <TD>{item.category}</TD>
                      <TD>{item.expiry_date}</TD>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.days_until < 0 ? 'bg-rose-100 text-rose-700' : item.days_until <= 30 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.status}
                        </span>
                      </td>
                    </TR>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeReport === 'staff' && (
            staffError ? <ErrorPanel message={staffError?.message} onRetry={refetchStaff} />
            : loadingStaff ? <PanelSkeleton rows={5} />
            : staffData?.activity?.length === 0 ? <EmptyState icon={UserGroupIcon} title="No activity found" message="No staff activity in the selected date range." />
            : (
              <table className="w-full text-left">
                <thead><tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <TH>Staff Member</TH><TH right>Total Dispensations</TH><TH right>Revenue Handled (KES)</TH>
                </tr></thead>
                <tbody>
                  {staffData.activity.map((item, idx) => (
                    <TR key={idx}>
                      <TD bold>{item.dispensed_by__username}</TD>
                      <TD right bold>{item.total_sales}</TD>
                      <TD right bold accent>{fmt(item.total_revenue)}</TD>
                    </TR>
                  ))}
                </tbody>
              </table>
            )
          )}

          {activeReport === 'procurement' && (
            procurementError ? <ErrorPanel message={procurementError?.message} onRetry={refetchProcurement} />
            : loadingProcurement ? <PanelSkeleton rows={5} />
            : (
              <div className="space-y-8">
                <div className="px-4 py-3 rounded-xl font-semibold text-sm" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
                  Switching to best-price suppliers could save KES {fmt(procurementData?.total_annual_savings)} per year
                </div>
                {procurementData?.dependency_alerts?.map(a => (
                  <div key={a.supplier_id} className="flex items-start gap-2 p-3 rounded-xl text-sm border" style={{ background: 'rgba(245,158,11,0.10)', borderColor: 'rgba(245,158,11,0.25)', color: '#92400e' }}>
                    <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    High dependency on {a.supplier_name} — {a.pct}% of your products.
                  </div>
                ))}
                <div className="h-64">
                  <h3 className="font-bold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>Spending by Supplier (12 months)</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={procurementData?.spending_by_supplier || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                      <XAxis dataKey="supplier_name" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12 }} />
                      <Bar dataKey="total_spent" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-64">
                  <h3 className="font-bold mb-2 text-sm" style={{ color: 'var(--text-primary)' }}>Average Cost Trend</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={procurementData?.price_trend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} />
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 12 }} />
                      <Line type="monotone" dataKey="avg_price" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                    <TH>Product</TH><TH>Current</TH><TH>Cheapest</TH><TH right>Annual Saving</TH>
                  </tr></thead>
                  <tbody>
                    {(procurementData?.potential_savings || []).slice(0, 20).map(row => (
                      <TR key={row.product_id}>
                        <TD>{row.product_name}</TD>
                        <TD>{row.current_supplier} @ {row.current_price}</TD>
                        <TD>{row.cheapest_supplier} @ {row.cheapest_price}</TD>
                        <TD right bold accent>KES {row.annual_saving?.toLocaleString()}</TD>
                      </TR>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
};

export default ReportsDashboard;
