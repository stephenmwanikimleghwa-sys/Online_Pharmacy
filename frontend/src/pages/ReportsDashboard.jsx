import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { prescriptionService } from '../services/prescriptionService';
import { inventoryService } from '../services/inventoryService';
import reportService from '../services/reportService';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

const ReportsDashboard = () => {
  // ... (state and effect remain the same)
  const [reportData, setReportData] = useState({
    dailyPrescriptions: [],
    medicinesDispensed: [],
    stockUsage: [],
    inventoryTrends: [],
    performanceMetrics: [],
    topSellingProducts: [],
    lowStockAlerts: []
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const dailyData = await prescriptionService.getDailyPrescriptions(dateRange);
      const medicinesData = await prescriptionService.getDispensedMedicines(dateRange);
      const stockData = await inventoryService.getStockUsage(dateRange);

      let trendsData = [];
      let performanceData = [];

      if (user?.role === 'admin') {
        try {
          const trends = await reportService.getInventoryTrends(30);
          trendsData = trends.trends || [];

          const performance = await reportService.getPharmacistPerformance();
          performanceData = performance.performance || [];

          const topSelling = await reportService.getTopSellingProducts(30);
          const lowStock = await reportService.getLowStockAlerts();

          setReportData(prev => ({
            ...prev,
            topSellingProducts: topSelling || [],
            lowStockAlerts: lowStock || []
          }));
        } catch (err) {
          console.error("Failed to fetch admin analytics:", err);
        }
      }

      setReportData(prev => ({
        ...prev,
        dailyPrescriptions: dailyData.data || [],
        medicinesDispensed: medicinesData.data || [],
        stockUsage: stockData.data || [],
        inventoryTrends: trendsData,
        performanceMetrics: performanceData
      }));
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      await reportService.exportPDF(30);
    } catch (error) {
      alert('Failed to generate PDF report. Please try again.');
    }
  };

  const exportToCSV = () => {
    alert('CSV export is coming soon.');
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-indigo-600 border-t-transparent shadow-glow-sm"></div>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in text-slate-800">
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-glow">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Reports &amp; Analytics</h1>
          </div>
          <p className="text-lg text-slate-500 max-w-2xl">
            {user?.role === 'admin' ? 'Track stock levels, sales trends, and how your pharmacy team is performing.' : 'See how many prescriptions you processed each day, which medicines you dispensed, and how much stock was used.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={exportToPDF}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold shadow-soft hover:shadow-card hover:bg-slate-50 transition-all flex items-center gap-2.5 active:scale-[0.98]"
          >
            <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-4-4h3V4h2v8h3l-4 4zm9-4v10H3V12h2v8h14v-8h2z" /></svg>
            Export PDF
          </button>
          <button
            onClick={exportToCSV}
            className="px-6 py-3 btn-primary text-white rounded-2xl font-bold shadow-glow hover:shadow-premium  transition-all flex items-center gap-2.5 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 16l-4-4h3V4h2v8h3l-4 4zm9-4v10H3V12h2v8h14v-8h2z" /></svg>
            Excel Dataset
          </button>
        </div>
      </div>

      {/* Modern Filter Section */}
      <div className="glass-card rounded-[2rem] p-8 mb-12 border border-white/60 shadow-premium relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
          <svg className="w-32 h-32 text-indigo-900" fill="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-indigo-50 rounded-xl">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-800 tracking-tight">Choose dates</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pick a start and end date to update the reports below.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
          <div className="md:col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Start date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold text-slate-700"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">End date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold text-slate-700"
            />
          </div>
          <div className="md:col-span-4 flex items-end">
            <button
              onClick={fetchReportData}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-black shadow-card transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Role-based Dashboard Views */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {user?.role === 'pharmacist' && (
          <>
            <div className="lg:col-span-12 glass-card rounded-[2rem] border border-white/50 shadow-premium overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-slate-900">Daily Prescription Activity</h2>
                    <p className="text-xs text-slate-400 mt-0.5">How many prescriptions were approved, rejected, and dispensed each day.</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/30">
                    <tr>
                      <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved</th>
                      <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rejected</th>
                      <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dispensed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.dailyPrescriptions.map((item, index) => (
                      <tr key={index} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="px-8 py-5 whitespace-nowrap font-display font-bold text-slate-700">{item.date}</td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="text-primary font-bold bg-indigo-50 px-3 py-1 rounded-full text-sm border border-indigo-100/50">{item.validated}</span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-full text-sm border border-rose-100/50">{item.rejected || 0}</span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap font-display font-bold text-slate-900">{item.dispensed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-6 glass-card rounded-[2rem] p-8 border border-white/50 shadow-premium">
              <h2 className="text-xl font-display font-bold text-slate-900 mb-2 border-l-4 border-indigo-500 pl-4">Medicines Dispensed</h2>
              <p className="text-xs text-slate-400 mb-8 pl-4">Medicines you dispensed in the selected period and their total sales value.</p>
              <div className="space-y-4">
                {reportData.medicinesDispensed.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-100 group hover:border-indigo-200 hover:bg-white hover:shadow-card transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">💊</div>
                      <div>
                        <p className="font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Approved: {item.validated}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-primary text-lg">KES {item.totalValue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 glass-card rounded-[2rem] p-8 border border-white/50 shadow-premium">
                    <h2 className="text-xl font-display font-bold text-slate-900 mb-2 border-l-4 border-emerald-500 pl-4">Stock used</h2>
              <p className="text-xs text-slate-400 mb-8 pl-4">This shows what you started with, what you dispensed, and what is left.</p>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="text-left pb-6">Medicine</th>
                      <th className="text-right pb-6">Start</th>
                      <th className="text-right pb-6">Dispensed</th>
                      <th className="text-right pb-6">Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.stockUsage.map((item, index) => (
                      <tr key={index} className="group cursor-default">
                        <td className="py-4 text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">{item.product}</td>
                        <td className="py-4 text-right text-sm text-slate-500 font-medium">{item.startingStock}</td>
                        <td className="py-4 text-right text-sm font-bold text-rose-500">-{item.dispensed}</td>
                        <td className="py-4 text-right text-sm font-display font-bold text-slate-900 underline decoration-emerald-200 decoration-2 underline-offset-4">{item.endingStock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {user?.role === 'admin' && (
          <>
            {/* Inventory Trends */}
            <div className="lg:col-span-12 glass-card rounded-[2rem] p-8 border border-white/50 shadow-premium">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Stock changes</h2>
                    <p className="text-xs text-slate-400 mt-1">This shows stock added vs. stock used in the last 30 days.</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 px-3 py-1.5 glass-card  border border-emerald-50">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Restock</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 glass-card  border border-rose-50">
                    <span className="w-2.5 h-2.5 bg-rose-400 rounded-full shadow-[0_0_8px_rgba(251,113,133,0.5)]"></span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Used</span>
                  </div>
                </div>
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData.inventoryTrends}>
                    <defs>
                      <linearGradient id="colorRestock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FB7185" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#FB7185" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={15} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dx={-15} />
                    <Tooltip
                      contentStyle={{ borderRadius: '24px', border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', background: 'rgba(255,255,255,0.95)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', padding: '16px' }}
                    />
                    <Line type="monotone" dataKey="restock_count" stroke="#10B981" strokeWidth={4} dot={{ r: 5, fill: '#10B981', strokeWidth: 3, stroke: '#fff shadow-lg' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                    <Line type="monotone" dataKey="usage_count" stroke="#FB7185" strokeWidth={4} dot={{ r: 5, fill: '#FB7185', strokeWidth: 3, stroke: '#fff shadow-lg' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Heatmap */}
            <div className="lg:col-span-7 glass-card rounded-[2rem] p-8 border border-white/50 shadow-premium">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div>
                  <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight">Staff activity</h2>
                  <p className="text-xs text-slate-400 mt-1">How many prescriptions each staff member verified in the selected period.</p>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.performanceMetrics} margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="verified_by__username" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dx={-10} />
                    <Tooltip cursor={{ fill: '#f8fafc', radius: 12 }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="verified_count" fill="#4f46e5" radius={[12, 12, 4, 4]} barSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Selling Mix */}
            <div className="lg:col-span-5 glass-card rounded-[2rem] p-8 border border-white/50 shadow-premium group">
              <h2 className="text-xl font-display font-bold text-slate-900 mb-2 border-l-4 border-fuchsia-500 pl-4 tracking-tight">Most sold medicines</h2>
              <p className="text-xs text-slate-400 mb-10 pl-4">These are the medicines sold most often in the selected period.</p>
              <div className="h-80 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.topSellingProducts}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={105}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {reportData.topSellingProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} stroke="rgba(255,255,255,0.5)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Visual Center Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-10 md:mb-0">
                  <div className="text-center group-hover:scale-110 transition-transform duration-500">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Volume</p>
                    <p className="text-2xl font-display font-bold text-slate-900">100%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Alerts Bento */}
            <div className="lg:col-span-12 glass-card rounded-[2rem] p-10 border-l-8 border-l-rose-500 shadow-premium relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-[0.05]">
                <svg className="w-24 h-24 text-rose-900" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center shadow-soft">
                    <svg className="w-8 h-8 text-rose-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Low Stock Alerts</h2>
                    <p className="text-slate-500 text-sm mt-1">These medicines are running low and need to be restocked soon.</p>
                  </div>
                </div>
                <button className="px-6 py-2.5 bg-rose-50 text-rose-600 font-bold text-xs rounded-xl border border-rose-100 uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-[0.98]">Export Report</button>
              </div>

              {reportData.lowStockAlerts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {reportData.lowStockAlerts.map((item) => (
                    <div key={item.id} className="p-6 bg-white/50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-card group transition-all">
                      <h3 className="font-bold text-slate-900 mb-4 truncate group-hover:text-rose-600 transition-colors uppercase text-xs tracking-tight">{item.name}</h3>
                      <div className="flex items-end justify-between mb-4">
                        <div className="text-3xl font-display font-bold text-rose-600">{item.stock_quantity}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-2 py-0.5 bg-slate-50 rounded-full">Units Left</div>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2 shadow-inner">
                        <div className="bg-gradient-to-r from-rose-500 to-rose-400 h-full group-hover:from-rose-600 group-hover:to-rose-500 transition-all" style={{ width: `${Math.min((item.stock_quantity / item.reorder_threshold) * 100, 100)}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
                        <span className="text-slate-400">Critical: {item.reorder_threshold}</span>
                        <span className="text-rose-400">-{item.reorder_threshold - item.stock_quantity} Deficit</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-24 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center opacity-60">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-soft mb-4">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="font-display font-bold text-slate-800">All stock levels are good</p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">No medicines need restocking right now</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsDashboard;
