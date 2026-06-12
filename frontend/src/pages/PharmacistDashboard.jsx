import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import prescriptionService from "../services/prescriptionService";
import LoadingSpinner from "../components/LoadingSpinner";
import WelcomeBanner from "../components/WelcomeBanner";
import inventoryService from "../services/inventoryService";
import { useAuth } from "../context/AuthContext";
import { useBranchParam } from "../hooks/useBranchParam";
import PrescriptionCard from "../components/PrescriptionCard";
import InventorySummaryCard from "../components/InventorySummaryCard";
import QuickActions from "../components/QuickActions";
import QuickSale from "../components/QuickSale";

const PharmacistDashboard = () => {
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [dispensedPrescriptions, setDispensedPrescriptions] = useState([]);
  const [inventorySummary, setInventorySummary] = useState({});
  const [loading, setLoading] = useState(true);
  const { user, activeBranch, requiresBranchSelection, loading: authLoading } = useAuth();
  const { branchParams } = useBranchParam();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    fetchDashboardData();
  }, [user, authLoading, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [pending, dispensed, inventory] = await Promise.all([
        prescriptionService.getPendingPrescriptions(),
        prescriptionService.getDispensedPrescriptions(),
        inventoryService.getInventorySummary(branchParams),
      ]);

      // Normalize different API response shapes: some endpoints return axios responses
      // ({ data: [...] }) while others may directly return arrays/objects.
      const normalizeList = (res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (res.data && Array.isArray(res.data)) return res.data;
        // handle paginated { results: [...] }
        if (res.results && Array.isArray(res.results)) return res.results;
        return [];
      };

      const normalizeObject = (res) => {
        if (!res) return {};
        if (res.data && typeof res.data === 'object') return res.data;
        if (typeof res === 'object') return res;
        return {};
      };

      setPendingPrescriptions(normalizeList(pending));
      setDispensedPrescriptions(normalizeList(dispensed));
      setInventorySummary(normalizeObject(inventory));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  if (authLoading || loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <LoadingSpinner size="lg" />
        <p className="animate-pulse" style={{color:'var(--text-secondary)'}}>Loading your dashboard...</p>
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
          onViewInventory={() => navigate("/inventory")}
        />
      </div>

      {/* Quick Operations below inventory summary */}
      <div className="mb-10">
        <QuickActions
          onQuickSale={() => setIsQuickSaleOpen(true)}
          onAddPrescription={handleAddPrescription}
          onViewReports={handleViewReports}
          onViewInventory={() => navigate("/inventory")}
        />
      </div>

      {/* Main Content Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">

        {/* Direct OTC Sale (moved to primary slot) */}
        <div className="lg:col-span-12 btn-primary rounded-[2rem] p-8 shadow-glow text-white relative overflow-hidden group">
          {/* Decorative blobs */}
          <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
          <div className="absolute bottom-[-40px] left-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-2xl font-display font-bold mb-3 tracking-tight">Direct OTC Sale</h3>
            <p className="text-sm mb-8 font-medium leading-relaxed" style={{color:'rgba(255,255,255,0.8)'}}>Handle non-prescription over-the-counter sales instantly and update inventory.</p>
            <button
              onClick={() => setIsQuickSaleOpen(true)}
              className="w-full py-4 bg-white text-lg font-bold rounded-2xl shadow-lg transform group-hover:scale-[1.02] active:scale-[0.98] transition-all"
              style={{color:'var(--color-primary)'}}
            >
              Quick Sale (OTC)
            </button>
          </div>
        </div>

        {/* Pending Prescriptions - moved to side */}
        <div className="lg:col-span-12 glass-card rounded-[2rem] p-8 flex flex-col border shadow-premium" style={{borderColor:'var(--border-primary)'}}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{background:'var(--brand-mist)'}}>
                <svg className="w-6 h-6" style={{color:'var(--brand-color)'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h2 className="text-2xl font-display font-bold tracking-tight" style={{color:'var(--text-primary)'}}>
                Pending Prescriptions
              </h2>
            </div>
            <span className="px-4 py-1.5 text-primary text-[10px] font-bold rounded-full border uppercase tracking-widest" style={{background:'var(--brand-mist)', borderColor:'var(--brand-border-soft)'}}>
              {pendingPrescriptions.length} Active Scripts
            </span>
          </div>

          {pendingPrescriptions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 rounded-3xl border border-dashed" style={{background:'var(--bg-field)', borderColor:'var(--border-primary)', color:'var(--text-secondary)'}}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-soft mb-6 opacity-60" style={{background:'var(--bg-card)'}}>
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-lg font-display font-bold" style={{color:'var(--text-primary)'}}>Queue is Clear</p>
              <p className="text-sm mt-1" style={{color:'var(--text-secondary)'}}>No pending prescriptions require your attention.</p>
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
          <div className="glass-card rounded-[2rem] p-8 border shadow-premium" style={{borderColor:'var(--border-primary)'}}>
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
                <p className="text-xs font-bold uppercase tracking-widest italic text-center">No history for this session</p>
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
                    Open Dispensing Ledger
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Quick Sale Modal */}
      <QuickSale isOpen={isQuickSaleOpen} onClose={() => setIsQuickSaleOpen(false)} />
    </div>
  );
};

export default PharmacistDashboard;
