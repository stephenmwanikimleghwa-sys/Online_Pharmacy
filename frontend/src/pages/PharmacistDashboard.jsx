import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import prescriptionService from "../services/prescriptionService";
import WelcomeBanner from "../components/WelcomeBanner";
import { StatCardSkeleton, PanelSkeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import PrescriptionCard from "../components/PrescriptionCard";
import InventorySummaryCard from "../components/InventorySummaryCard";
import QuickActions from "../components/QuickActions";
import QuickSale from "../components/QuickSale";
import ExpiryAlertsWidget from "../components/ExpiryAlertsWidget";
import { useInventorySummary } from "../hooks/useProducts";
import { useExpiryAlerts } from "../hooks/useExpiryAlerts";

const normalizeList = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res.data && Array.isArray(res.data)) return res.data;
  if (res.results && Array.isArray(res.results)) return res.results;
  return [];
};

const PharmacistDashboard = () => {
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [dispensedPrescriptions, setDispensedPrescriptions] = useState([]);
  const [rxLoading, setRxLoading] = useState(true);
  const { user, activeBranch, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    data: summaryData,
    isLoading: summaryLoading,
  } = useInventorySummary();

  const {
    isLoading: expiryLoading,
  } = useExpiryAlerts(activeBranch?.id);

  const inventorySummary = {
    totalProducts: summaryData?.totalProducts || 0,
    lowStockItems: summaryData?.lowStockItems || 0,
    outOfStockItems: summaryData?.outOfStockItems || 0,
  };

  const dashboardLoading =
    summaryLoading || expiryLoading;

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    const fetchPrescriptions = async () => {
      try {
        setRxLoading(true);
        const [pending, dispensed] = await Promise.all([
          prescriptionService.getPendingPrescriptions(),
          prescriptionService.getDispensedPrescriptions(),
        ]);
        setPendingPrescriptions(normalizeList(pending));
        setDispensedPrescriptions(normalizeList(dispensed));
      } catch {
        setPendingPrescriptions([]);
        setDispensedPrescriptions([]);
      } finally {
        setRxLoading(false);
      }
    };
    void fetchPrescriptions();
  }, [user, authLoading, navigate]);

  const handleAddPrescription = () => {
    navigate("/prescriptions/add");
  };

  const handleViewReports = () => {
    navigate("/reports");
  };

  const handlePrescriptionAction = (prescriptionId, action) => {
    if (action === "validate" || action === "reject") {
      navigate(`/prescriptions/${prescriptionId}/validate`);
    } else if (action === "dispense") {
      navigate(`/prescriptions/${prescriptionId}/dispense`);
    }
  };

  if (authLoading || rxLoading || dashboardLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        <div className="h-8 w-64 animate-shimmer rounded-xl mb-8" />
        <div className="glass-card rounded-2xl p-6 mb-10">
          <div className="h-6 w-48 animate-shimmer rounded-lg mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-shimmer rounded-2xl" />
          ))}
        </div>
        <PanelSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Inventory Summary immediately after greeting */}
      <div className="mb-10">
        <InventorySummaryCard
          summary={inventorySummary}
          onViewInventory={() => navigate("/inventory/management")}
        />
      </div>

      {/* Quick Operations below inventory summary */}
      <div className="mb-10">
        <QuickActions
          onQuickSale={() => setIsQuickSaleOpen(true)}
          onAddPrescription={handleAddPrescription}
          onViewReports={handleViewReports}
          onViewInventory={() => navigate("/inventory/management")}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">

        <div
          className="lg:col-span-12 glass-card p-6 md:p-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{ borderRadius: 'var(--radius-surface)' }}
        >
          <div>
            <h3 className="text-xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              OTC sale
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Ring up a non-prescription sale and update stock.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsQuickSaleOpen(true)}
            className="btn-primary px-7 py-3 rounded-lg text-white font-semibold text-sm whitespace-nowrap"
          >
            Start sale
          </button>
        </div>

        <div className="lg:col-span-12 glass-card rounded-xl p-6 md:p-8 flex flex-col border" style={{borderColor:'var(--border-primary)'}}>
          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <h2 className="text-xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>
              Pending prescriptions
            </h2>
            <span className="brand-mist px-3 py-1 text-xs font-semibold rounded-md">
              {pendingPrescriptions.length} waiting
            </span>
          </div>

          {pendingPrescriptions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-14 rounded-xl border border-dashed" style={{background:'var(--bg-field)', borderColor:'var(--border-primary)', color:'var(--text-secondary)'}}>
              <p className="text-base font-display font-semibold" style={{color:'var(--text-primary)'}}>No pending prescriptions</p>
              <p className="text-sm mt-1" style={{color:'var(--text-secondary)'}}>New scripts will show up here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {pendingPrescriptions.slice(0, 4).map((prescription) => (
                  <PrescriptionCard
                    key={prescription.id}
                    prescription={prescription}
                    onAction={handlePrescriptionAction}
                    showActions={true}
                  />
                ))}
              </div>
              {pendingPrescriptions.length > 4 && (
                <button
                  onClick={() => navigate("/prescriptions/pending")}
                  className="w-full py-4 font-bold text-sm rounded-2xl border transition-all active:scale-[0.99] form-cancel-btn"
                >
                  View full queue ({pendingPrescriptions.length} items) →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recently Dispensed and Pending scripts section */}
        <div className="lg:col-span-12 flex flex-col gap-8">
          <div className="glass-card rounded-xl p-8 border shadow-premium" style={{borderColor:'var(--border-primary)'}}>
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-xl" style={{background:'rgba(16,185,129,0.12)'}}>
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <h2 className="text-xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>
                Recently Dispensed
              </h2>
            </div>

            {dispensedPrescriptions.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center opacity-60" style={{color:'var(--text-secondary)'}}>
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm text-center">No dispensed prescriptions yet today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dispensedPrescriptions.slice(0, 3).map((prescription) => (
                  <PrescriptionCard
                    key={prescription.id}
                    prescription={prescription}
                    showActions={false}
                  />
                ))}
                {dispensedPrescriptions.length > 3 && (
                  <button
                    onClick={() => navigate("/prescriptions/dispensed")}
                    className="w-full py-3 text-primary text-sm font-bold rounded-xl transition-all active:scale-[0.98]" style={{background:'var(--brand-mist)'}}
                  >
                    View all dispensed
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        <div className="lg:col-span-12 md:col-span-2 col-span-1 mt-8">
          <ExpiryAlertsWidget compact />
        </div>
      </div>

      {/* Quick Sale Modal */}
      <QuickSale isOpen={isQuickSaleOpen} onClose={() => setIsQuickSaleOpen(false)} />
    </div>
  );
};

export default PharmacistDashboard;
