import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import WelcomeBanner from "../components/WelcomeBanner";
import QuickSale from "../components/QuickSale";
import { PanelSkeleton, Skeleton } from "../components/ui/Skeleton";
import { formatDate } from "../utils/displayHelpers";

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
            const today = formatDate(new Date(), "yyyy-MM-dd", "");
            const filtered = (response.data || []).filter(order =>
                formatDate(order.created_at, "yyyy-MM-dd", "") === today
            );
            setRecentSales(filtered);
        } catch (error) {
            } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
                <Skeleton className="h-8 w-64 mb-8" rounded="rounded-xl" />
                <Skeleton className="h-48 w-full mb-10" rounded="rounded-[2.5rem]" />
                <PanelSkeleton rows={5} />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
            <WelcomeBanner />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sales Action - Left Cell */}
                <div className="lg:col-span-12">
                    <div className="btn-primary rounded-[2.5rem] p-10 shadow-glow text-white relative overflow-hidden group mb-10">
                        <div className="absolute top-[-20px] right-[-20px] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="absolute bottom-[-40px] left-[-20px] w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 border border-white/20 shadow-xl">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h2 className="text-4xl font-display font-bold mb-4 tracking-tight">Active Terminal</h2>
                            <p className="text-white/80 text-lg mb-10 font-medium max-w-xl italic">Manage over-the-counter transactions and generate instant receipts.</p>
                            <button
                                onClick={() => setIsQuickSaleOpen(true)}
                                className="px-12 py-5 bg-white text-2xl font-display font-bold rounded-[2rem] shadow-2xl transform hover:scale-105 active:scale-[0.98] transition-all"
                                style={{color:'var(--color-primary)'}}
                            >
                                Process New Sale
                            </button>
                        </div>
                    </div>
                </div>

                {/* Today's Transactions */}
                <div className="lg:col-span-12">
                    <div className="glass-card rounded-[2.5rem] p-8 border shadow-premium" style={{borderColor:'var(--border-primary)'}}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl" style={{background:'rgba(16,185,129,0.12)'}}>
                                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>Today's Transactions</h2>
                                    <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{color:'var(--text-secondary)'}}>Registry Log: {formatDate(new Date(), "MMMM dd, yyyy", "")}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:'var(--text-secondary)'}}>Session Total</p>
                                <p className="text-2xl font-display font-bold text-primary">
                                    KES {recentSales.reduce((acc, sale) => acc + parseFloat(sale.total_amount || 0), 0).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {recentSales.length === 0 ? (
                            <div className="py-24 text-center rounded-3xl border-2 border-dashed" style={{background:'var(--bg-field)', borderColor:'var(--border-primary)'}}>
                                <svg className="w-16 h-16 mx-auto mb-6" style={{color:'var(--border-primary)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="font-bold uppercase tracking-widest text-sm" style={{color:'var(--text-secondary)'}}>No transactions recorded today</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b" style={{borderColor:'var(--border-primary)'}}>
                                            <th className="py-5 text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Order ID</th>
                                            <th className="py-5 text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Time</th>
                                            <th className="py-5 text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Status</th>
                                            <th className="py-5 text-right text-[10px] font-bold uppercase tracking-widest" style={{color:'var(--text-secondary)'}}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{borderColor:'var(--border-primary)'}}>
                                        {recentSales.map((sale) => (
                                            <tr key={sale.id} className="group transition-colors" style={{}} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-field)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                                                <td className="py-5 font-bold font-mono text-sm" style={{color:'var(--text-primary)'}}>#ORD-{sale.id}</td>
                                                <td className="py-5 text-sm font-medium" style={{color:'var(--text-secondary)'}}>{formatDate(sale.created_at, "HH:mm a", '—')}</td>
                                                <td className="py-5">
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-widest">
                                                        {sale.status}
                                                    </span>
                                                </td>
                                                <td className="py-5 text-right font-display font-bold text-lg" style={{color:'var(--text-primary)'}}>
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
                    fetchRecentSales();
                }}
            />
        </div>
    );
};

export default CashierDashboard;
