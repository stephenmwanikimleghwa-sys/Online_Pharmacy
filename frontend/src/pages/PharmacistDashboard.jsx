import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPendingPrescriptions,
  getDispensedPrescriptions,
} from "../services/prescriptionService";
import LoadingSpinner from "../components/LoadingSpinner";
import WelcomeBanner from "../components/WelcomeBanner";
import inventoryService from "../services/inventoryService";
import { useAuth } from "../context/AuthContext";
import PrescriptionCard from "../components/PrescriptionCard";
import InventorySummaryCard from "../components/InventorySummaryCard";
import QuickActions from "../components/QuickActions";

const PharmacistDashboard = () => {
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
        getPendingPrescriptions(),
        getDispensedPrescriptions(),
        inventoryService.getInventorySummary(),
      ]);

      setPendingPrescriptions(pending.data || []);
      setDispensedPrescriptions(dispensed.data || []);
      setInventorySummary(inventory.data || {});
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
      </div>

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
