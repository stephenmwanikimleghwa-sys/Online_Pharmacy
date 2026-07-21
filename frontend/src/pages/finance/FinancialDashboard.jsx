import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import financeService from '../../services/financeService';
import { BanknotesIcon, ArrowTrendingUpIcon, ArrowDownTrayIcon, BuildingLibraryIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import BranchSelector from '../../components/BranchSelector';
import { useAuth } from '../../context/AuthContext';
import { utils, writeFile } from 'xlsx';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import { PanelSkeleton, Skeleton } from '../../components/ui/Skeleton';

const money = (n) => `KES ${Number(n || 0).toLocaleString()}`;

const FinancialDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cash_flow');
  const [selectedBranch, setSelectedBranch] = useState(user?.branch?.id || '');

  // Queries
  const { data: cashFlowData, isLoading: isLoadingCashFlow } = useQuery({
    queryKey: ['cashFlow', selectedBranch],
    queryFn: () => financeService.getCashFlow(selectedBranch),
    staleTime: 30000,
  });

  const { data: balancesData, isLoading: isLoadingBalances } = useQuery({
    queryKey: ['accountBalances', selectedBranch],
    queryFn: () => financeService.getAccountBalances(selectedBranch),
    staleTime: 30000,
  });

  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['debtorCreditorSummary'],
    queryFn: () => financeService.getDebtorCreditorSummary(),
    staleTime: 30000,
  });

  const { data: ledgerData, isLoading: isLoadingLedger } = useQuery({
    queryKey: ['legacyLedger'],
    queryFn: () => financeService.getLegacyLedger(),
    staleTime: 30000,
  });

  const handleExportCSV = () => {
    let dataToExport = [];
    let filename = 'export.xlsx';

    if (activeTab === 'cash_flow') {
      dataToExport = cashFlowData?.cash_flow || [];
      filename = 'cash_flow.xlsx';
    } else if (activeTab === 'account_balances') {
      const b = balancesData?.account_balances || {};
      dataToExport = Object.keys(b).map(k => ({ PaymentMode: k, Total: b[k] }));
      filename = 'account_balances.xlsx';
    } else if (activeTab === 'legacy_ledger') {
      dataToExport = ledgerData?.legacy_ledger || [];
      filename = 'legacy_ledger.xlsx';
    } else {
      dataToExport = [summaryData || {}];
      filename = 'ar_ap_summary.xlsx';
    }

    const ws = utils.json_to_sheet(dataToExport);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Data");
    writeFile(wb, filename);
  };

  const tabs = [
    { id: 'cash_flow', label: 'Cash Flow', icon: ArrowTrendingUpIcon },
    { id: 'account_balances', label: 'Account Balances', icon: BuildingLibraryIcon },
    { id: 'summary', label: 'AR / AP Summary', icon: UserGroupIcon },
    { id: 'legacy_ledger', label: 'Legacy Ledger', icon: ClockIcon },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <BanknotesIcon className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
            Financial Overview
          </h1>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Monitor cash flow, balances, and credit summaries.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {['cash_flow', 'account_balances'].includes(activeTab) && (
             <div className="w-48">
               <BranchSelector onChange={b => setSelectedBranch(b?.id || '')} />
             </div>
          )}
          <button onClick={handleExportCSV} className="btn-primary px-4 py-2.5 rounded-xl font-bold text-sm shadow-premium flex items-center gap-2">
            <ArrowDownTrayIcon className="w-5 h-5" /> Export Data
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card rounded-[2rem] border shadow-sm p-2 flex overflow-x-auto custom-scrollbar" style={{ borderColor: 'var(--border-primary)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${isActive ? 'btn-primary text-white shadow-md' : ''}`}
              style={isActive ? {} : { color: 'var(--text-secondary)' }}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="glass-card rounded-[2rem] border shadow-premium p-6 sm:p-8 min-h-[50vh]" style={{ borderColor: 'var(--border-primary)' }}>
        {activeTab === 'cash_flow' && (
          <div className="space-y-6">
            <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>30-Day Cash Flow</h2>
            {isLoadingCashFlow ? <Skeleton className="h-64 w-full" rounded="rounded-xl" /> : (
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlowData?.cash_flow || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: 'var(--text-secondary)'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 12, fill: 'var(--text-secondary)'}} axisLine={false} tickLine={false} tickFormatter={val => `KES ${val}`} />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: '1px solid var(--border-primary)', background: 'var(--bg-card)' }} />
                    <Line type="monotone" dataKey="income" stroke="var(--color-primary)" strokeWidth={3} dot={{r: 4, fill: 'var(--color-primary)'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'account_balances' && (
          <div className="space-y-6">
            <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Current Account Balances (Income)</h2>
            {isLoadingBalances ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-24" rounded="rounded-2xl" />)}
              </div>
            ) : Object.keys(balancesData?.account_balances || {}).length === 0 ? (
              <EmptyState icon={BuildingLibraryIcon} title="No balances recorded" message="Account balances will appear here once income is recorded." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(balancesData?.account_balances || {}).map(([mode, amount], i) => (
                  <StatCard
                    key={mode}
                    label={mode}
                    value={Number(amount) || 0}
                    format={money}
                    icon={BanknotesIcon}
                    accent={['emerald', 'indigo', 'primary'][i % 3]}
                    delayIndex={(i % 6) + 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6">
            <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Accounts Receivable & Payable</h2>
            {isLoadingSummary ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[0, 1].map(i => <Skeleton key={i} className="h-40" rounded="rounded-3xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AR */}
                <div className="glass-card p-6 rounded-3xl border" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-6" style={{ color: '#059669' }}>Accounts Receivable (AR)</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Debts (Owed to Pharmacy)</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{money(summaryData?.debtors_total)}</p>
                    </div>
                    <div className="border-t pt-4" style={{ borderColor: 'rgba(16,185,129,0.25)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Supplier Credits (Pharmacy Overpaid Suppliers)</p>
                      <p className="text-xl font-bold text-emerald-600">{money(summaryData?.supplier_store_credit_total)}</p>
                    </div>
                  </div>
                </div>

                {/* AP */}
                <div className="glass-card p-6 rounded-3xl border" style={{ borderColor: 'rgba(244,63,94,0.25)' }}>
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-6" style={{ color: '#e11d48' }}>Accounts Payable (AP)</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Supplier Debts (Owed by Pharmacy)</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{money(summaryData?.creditors_total)}</p>
                    </div>
                    <div className="border-t pt-4" style={{ borderColor: 'rgba(244,63,94,0.25)' }}>
                      <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Customer Credits (Customer Overpaid Pharmacy)</p>
                      <p className="text-xl font-bold text-rose-600">{money(summaryData?.customer_store_credit_total)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'legacy_ledger' && (
          <div className="space-y-6">
            <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Legacy System Ledger</h2>
            {isLoadingLedger ? <PanelSkeleton rows={6} /> : (
              <div className="overflow-x-auto">
                {ledgerData?.legacy_ledger?.length === 0 ? (
                  <EmptyState icon={ClockIcon} title="No ledger entries" message="No legacy ledger entries were found." />
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Date</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Type / Mode</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Description</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Reference</th>
                        <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerData?.legacy_ledger?.map(tx => (
                        <tr key={tx.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-primary)' }}>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(tx.transaction_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-xs font-semibold">
                            <span className="px-2 py-1 rounded" style={{ background: 'var(--brand-mist)', color: 'var(--color-primary)' }}>{tx.transaction_type}</span>
                            {tx.payment_mode && <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>{tx.payment_mode}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{tx.description}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{tx.reference_number || '-'}</td>
                          <td className="px-4 py-3 font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{money(tx.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default FinancialDashboard;
