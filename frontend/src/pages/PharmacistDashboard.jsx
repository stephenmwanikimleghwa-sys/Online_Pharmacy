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
    <div className="container mx-auto px-4 py-6">
      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Quick Actions */}
      <div className="mb-8">
        <QuickActions
          onAddPrescription={handleAddPrescription}
          onViewReports={handleViewReports}
          onViewInventory={() => navigate("/inventory")}
        />
        <button
          onClick={() => setIsQuickSaleOpen(true)}
          className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Quick Sale
        </button>
      </div>

      {/* Quick Sale Modal */}
      <QuickSale isOpen={isQuickSaleOpen} onClose={() => setIsQuickSaleOpen(false)} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Prescriptions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Pending Prescriptions
          </h2>
          {pendingPrescriptions.length === 0 ? (
            <p className="text-gray-500">No pending prescriptions</p>
          ) : (
            <div className="space-y-4">
              {pendingPrescriptions.slice(0, 5).map((prescription) => (
                <PrescriptionCard
                  key={prescription.id}
                  prescription={prescription}
                  onAction={handlePrescriptionAction}
                  showActions={true}
                />
              ))}
              {pendingPrescriptions.length > 5 && (
                <button
                  onClick={() => navigate("/prescriptions/pending")}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all pending prescriptions ({pendingPrescriptions.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dispensed Prescriptions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Recently Dispensed
          </h2>
          {dispensedPrescriptions.length === 0 ? (
            <p className="text-gray-500">No dispensed prescriptions</p>
          ) : (
            <div className="space-y-4">
              {dispensedPrescriptions.slice(0, 5).map((prescription) => (
                <PrescriptionCard
                  key={prescription.id}
                  prescription={prescription}
                  showActions={false}
                />
              ))}
              {dispensedPrescriptions.length > 5 && (
                <button
                  onClick={() => navigate("/prescriptions/dispensed")}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all dispensed prescriptions (
                  {dispensedPrescriptions.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Inventory Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Inventory Summary
          </h2>
          <InventorySummaryCard
            summary={inventorySummary}
            onViewInventory={() => navigate("/inventory")}
          />
        </div>
      </div>
    </div>
  );
};

export default PharmacistDashboard;
