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
                <Skeleton className="h-32 w-full mb-10" rounded="rounded-xl" />
                <PanelSkeleton rows={5} />
            </div>
        );
    }

    const sessionTotal = recentSales.reduce(
        (acc, sale) => acc + parseFloat(sale.total_amount || 0),
        0,
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
            <WelcomeBanner />

            <div
                className="glass-card p-6 md:p-7 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5"
                style={{ borderRadius: "var(--radius-surface)" }}
            >
                <div>
                    <h2
                        className="text-xl md:text-2xl font-display font-bold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                    >
                        Checkout
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                        Process over-the-counter sales and print receipts
                        {user?.username ? ` · ${user.username}` : ""}.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsQuickSaleOpen(true)}
                    className="btn-primary px-8 py-3.5 rounded-lg text-white text-base font-semibold whitespace-nowrap"
                >
                    New sale
                </button>
            </div>

            <div
                className="glass-card p-6 md:p-8 border"
                style={{ borderRadius: "var(--radius-surface)", borderColor: "var(--border-primary)" }}
            >
                <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                    <div>
                        <h2
                            className="text-xl font-display font-bold tracking-tight"
                            style={{ color: "var(--text-primary)" }}
                        >
                            Today&apos;s sales
                        </h2>
                        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                            {formatDate(new Date(), "MMMM dd, yyyy", "")}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>
                            Session total
                        </p>
                        <p className="text-xl font-display font-bold text-primary">
                            KES {sessionTotal.toLocaleString()}
                        </p>
                    </div>
                </div>

                {recentSales.length === 0 ? (
                    <div
                        className="py-16 text-center rounded-xl border border-dashed"
                        style={{ background: "var(--bg-field)", borderColor: "var(--border-primary)" }}
                    >
                        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                            No sales recorded today
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b" style={{ borderColor: "var(--border-primary)" }}>
                                    <th className="py-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Order</th>
                                    <th className="py-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Time</th>
                                    <th className="py-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Status</th>
                                    <th className="py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
                                {recentSales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td className="py-4 font-mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                            #ORD-{sale.id}
                                        </td>
                                        <td className="py-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                                            {formatDate(sale.created_at, "HH:mm a", "—")}
                                        </td>
                                        <td className="py-4">
                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-100 capitalize">
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right font-display font-bold" style={{ color: "var(--text-primary)" }}>
                                            KES {parseFloat(sale.total_amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
