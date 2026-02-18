import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import prescriptionService from "../services/prescriptionService";
import LoadingSpinner from "../components/LoadingSpinner";
import WelcomeBanner from "../components/WelcomeBanner";
import inventoryService from "../services/inventoryService";
import { useAuth } from "../context/AuthContext";
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
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [pending, dispensed, inventory] = await Promise.all([
        prescriptionService.getPendingPrescriptions(),
        prescriptionService.getDispensedPrescriptions(),
        inventoryService.getInventorySummary(),
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

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 animate-pulse">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Quick Actions & Quick Sale - Top Row Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        <div className="lg:col-span-12">
          <QuickActions
            onAddPrescription={handleAddPrescription}
            onViewReports={handleViewReports}
            onViewInventory={() => navigate("/inventory")}
          />
        </div>
      </div>

      {/* Main Content Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">

        {/* Pending Prescriptions - Large Bento Card */}
        <div className="lg:col-span-8 glass-card rounded-[2rem] p-8 flex flex-col border border-white/50 shadow-premium">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-xl">
                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">
                Pending Prescriptions
              </h2>
            </div>
            <span className="px-4 py-1.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full border border-amber-100 uppercase tracking-widest">
              {pendingPrescriptions.length} Active Scripts
            </span>
          </div>

          {pendingPrescriptions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-soft mb-6 opacity-60">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <p className="text-lg font-display font-bold text-slate-800">Queue is Clear</p>
              <p className="text-sm mt-1">No pending prescriptions require your attention.</p>
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
                  className="w-full py-4 bg-slate-50 hover:bg-white text-slate-600 hover:text-indigo-600 font-bold text-sm rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-soft transition-all active:scale-[0.99]"
                >
                  View full queue ({pendingPrescriptions.length} items) →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Recently Dispensed - Side Bento Card */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="glass-card rounded-[2rem] p-8 border border-white/50 shadow-premium">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight">
                Recently Dispensed
              </h2>
            </div>

            {dispensedPrescriptions.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 opacity-60">
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
                    className="w-full py-3 text-indigo-600 hover:text-indigo-700 text-sm font-bold bg-indigo-50 rounded-xl transition-all active:scale-[0.98]"
                  >
                    Open Dispensing Ledger
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Sale Module - Featured Callout */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[2rem] p-8 shadow-glow text-white relative overflow-hidden group">
            {/* Decorative blobs */}
            <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
            <div className="absolute bottom-[-40px] left-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-2xl font-display font-bold mb-3 tracking-tight">Direct OTC Sale</h3>
              <p className="text-indigo-100 text-sm mb-8 font-medium leading-relaxed opacity-90">Handle non-prescription over-the-counter sales instantly and update inventory.</p>
              <button
                onClick={() => setIsQuickSaleOpen(true)}
                className="w-full py-4 bg-white text-indigo-700 text-lg font-bold rounded-2xl shadow-lg transform group-hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Quick Sale (OTC)
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Summary - Bottom Wide Bento */}
        <div className="lg:col-span-12">
          <InventorySummaryCard
            summary={inventorySummary}
            onViewInventory={() => navigate("/inventory")}
          />
        </div>
      </div>

      {/* Quick Sale Modal */}
      <QuickSale isOpen={isQuickSaleOpen} onClose={() => setIsQuickSaleOpen(false)} />
    </div>
  );
};

export default PharmacistDashboard;
