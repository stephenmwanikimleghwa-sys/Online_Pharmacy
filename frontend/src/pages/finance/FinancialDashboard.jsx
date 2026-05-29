import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import financeService from '../../services/financeService';
import { BanknotesIcon, ArrowTrendingUpIcon, ArrowDownTrayIcon, BuildingLibraryIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import BranchSelector from '../../components/BranchSelector';
import { useAuth } from '../../context/AuthContext';
import { utils, writeFile } from 'xlsx';

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
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <BanknotesIcon className="w-8 h-8 text-primary" />
            Financial Overview
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Monitor cash flow, balances, and credit summaries.</p>
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
      <div className="glass-card rounded-[2rem] border border-white/60 shadow-sm p-2 flex overflow-x-auto custom-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${isActive ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className="glass-card rounded-[2rem] border border-white/60 shadow-premium p-6 sm:p-8 min-h-[50vh]">
        {activeTab === 'cash_flow' && (
          <div className="space-y-6">
            <h2 className="text-xl font-display font-bold text-slate-800">30-Day Cash Flow</h2>
            {isLoadingCashFlow ? <div className="animate-pulse h-64 bg-slate-100 rounded-xl"></div> : (
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cashFlowData?.cash_flow || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={val => `KES ${val}`} />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="income" stroke="var(--color-primary)" strokeWidth={3} dot={{r: 4, fill: 'var(--color-primary)'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === 'account_balances' && (
          <div className="space-y-6">
            <h2 className="text-xl font-display font-bold text-slate-800">Current Account Balances (Income)</h2>
            {isLoadingBalances ? <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div> : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(balancesData?.account_balances || {}).map(([mode, amount]) => (
                  <div key={mode} className="p-6 rounded-2xl border border-slate-100 bg-slate-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{mode}</p>
                    <p className="text-3xl font-display font-bold text-slate-800">KES {parseFloat(amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                  </div>
                ))}
                {Object.keys(balancesData?.account_balances || {}).length === 0 && (
                  <p className="text-slate-500">No balances recorded yet.</p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="space-y-6">
            <h2 className="text-xl font-display font-bold text-slate-800">Accounts Receivable & Payable</h2>
            {isLoadingSummary ? <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AR */}
                <div className="p-6 rounded-3xl border border-emerald-100 bg-emerald-50/30">
                  <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-widest mb-6">Accounts Receivable (AR)</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Customer Debts (Owed to Pharmacy)</p>
                      <p className="text-2xl font-bold text-slate-800">KES {parseFloat(summaryData?.debtors_total || 0).toLocaleString()}</p>
                    </div>
                    <div className="border-t border-emerald-100 pt-4">
                      <p className="text-xs text-slate-500 mb-1">Supplier Credits (Pharmacy Overpaid Suppliers)</p>
                      <p className="text-xl font-bold text-emerald-600">KES {parseFloat(summaryData?.supplier_store_credit_total || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* AP */}
                <div className="p-6 rounded-3xl border border-rose-100 bg-rose-50/30">
                  <h3 className="text-sm font-bold text-rose-600 uppercase tracking-widest mb-6">Accounts Payable (AP)</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Supplier Debts (Owed by Pharmacy)</p>
                      <p className="text-2xl font-bold text-slate-800">KES {parseFloat(summaryData?.creditors_total || 0).toLocaleString()}</p>
                    </div>
                    <div className="border-t border-rose-100 pt-4">
                      <p className="text-xs text-slate-500 mb-1">Customer Credits (Customer Overpaid Pharmacy)</p>
                      <p className="text-xl font-bold text-rose-600">KES {parseFloat(summaryData?.customer_store_credit_total || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'legacy_ledger' && (
          <div className="space-y-6">
            <h2 className="text-xl font-display font-bold text-slate-800">Legacy System Ledger</h2>
            {isLoadingLedger ? <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div> : (
              <div className="overflow-x-auto">
                {ledgerData?.legacy_ledger?.length === 0 ? (
                  <p className="text-slate-500 text-center py-10">No legacy ledger entries found.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest rounded-l-lg">Date</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type / Mode</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reference</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest rounded-r-lg">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerData?.legacy_ledger?.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-xs text-slate-600">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-xs font-semibold">
                            <span className="bg-slate-100 px-2 py-1 rounded">{tx.transaction_type}</span>
                            {tx.payment_mode && <span className="ml-2 text-slate-400">{tx.payment_mode}</span>}
                          </td>
                          <td className="px-4 py-3 text-sm">{tx.description}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{tx.reference_number || '-'}</td>
                          <td className="px-4 py-3 font-bold text-sm text-slate-800">KES {parseFloat(tx.amount).toLocaleString()}</td>
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
