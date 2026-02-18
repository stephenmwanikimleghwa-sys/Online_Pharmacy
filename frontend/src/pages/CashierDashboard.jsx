import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import WelcomeBanner from "../components/WelcomeBanner";
import QuickSale from "../components/QuickSale";
import { format } from "date-fns";

const CashierDashboard = () => {
    const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
    const [recentSales, setRecentSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        fetchRecentSales();
    }, []);

    const fetchRecentSales = async () => {
        try {
            setLoading(true);
            const response = await api.get("/orders/my-orders/");
            // For Cashiers, we only show today's sales
            const today = format(new Date(), "yyyy-MM-dd");
            const filtered = (response.data || []).filter(order =>
                format(new Date(order.created_at), "yyyy-MM-dd") === today
            );
            setRecentSales(filtered);
        } catch (error) {
            console.error("Error fetching recent sales:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 animate-pulse">Initializing Register...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
            <WelcomeBanner />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sales Action - Left Cell */}
                <div className="lg:col-span-12">
                    <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[2.5rem] p-10 shadow-glow text-white relative overflow-hidden group mb-10">
                        <div className="absolute top-[-20px] right-[-20px] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="absolute bottom-[-40px] left-[-20px] w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 border border-white/20 shadow-xl">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">Active Terminal</h2>
                            <p className="text-indigo-100 text-lg mb-10 font-medium max-w-xl opacity-90 italic">Manage over-the-counter transactions and generate instant receipts.</p>
                            <button
                                onClick={() => setIsQuickSaleOpen(true)}
                                className="px-12 py-5 bg-white text-indigo-700 text-2xl font-display font-bold rounded-[2rem] shadow-2xl transform hover:scale-105 active:scale-[0.98] transition-all bg-gradient-to-r from-white to-slate-50"
                            >
                                Process New Sale
                            </button>
                        </div>
                    </div>
                </div>

                {/* Today's Transactions - Main List */}
                <div className="lg:col-span-12">
                    <div className="glass-card rounded-[2.5rem] p-8 border border-white/50 shadow-premium">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-2xl">
                                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Today's Transactions</h2>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Registry Log: {format(new Date(), "MMMM dd, yyyy")}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Session Total</p>
                                <p className="text-2xl font-display font-bold text-indigo-600">
                                    KES {recentSales.reduce((acc, sale) => acc + parseFloat(sale.total_amount || 0), 0).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {recentSales.length === 0 ? (
                            <div className="py-24 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                                <svg className="w-16 h-16 text-slate-200 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No transactions recorded today</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</th>
                                            <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</th>
                                            <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {recentSales.map((sale) => (
                                            <tr key={sale.id} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="py-5 font-bold text-slate-900 font-mono text-sm">#ORD-{sale.id}</td>
                                                <td className="py-5 text-sm text-slate-500 font-medium">{format(new Date(sale.created_at), "HH:mm a")}</td>
                                                <td className="py-5">
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-widest">
                                                        {sale.status}
                                                    </span>
                                                </td>
                                                <td className="py-5 text-right font-display font-bold text-slate-900 text-lg">
                                                    KES {parseFloat(sale.total_amount).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <QuickSale
                isOpen={isQuickSaleOpen}
                onClose={() => {
                    setIsQuickSaleOpen(false);
                    fetchRecentSales(); // Refresh after sale
                }}
            />
        </div>
    );
};

export default CashierDashboard;
