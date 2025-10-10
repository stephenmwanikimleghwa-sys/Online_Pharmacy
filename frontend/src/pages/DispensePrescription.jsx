import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { prescriptionService } from '../services/prescriptionService';
import { inventoryService } from '../services/inventoryService';

const DispensePrescription = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState(false);
  const [dispensedMedicines, setDispensedMedicines] = useState({});
  const [inventoryStatus, setInventoryStatus] = useState({});

  useEffect(() => {
    fetchPrescription();
  }, [id]);

  const fetchPrescription = async () => {
    try {
      const response = await prescriptionService.getPrescription(id);
      setPrescription(response.data);
      await checkInventory(response.data);
    } catch (error) {
      console.error('Error fetching prescription:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkInventory = async (prescriptionData) => {
    const status = {};
    // Check inventory for each prescribed medicine
    for (const medicine of prescriptionData.prescribed_medicines || []) {
      try {
        const inventoryResponse = await inventoryService.getInventoryItem(medicine.id);
        status[medicine.id] = {
          available: inventoryResponse.data.stock_quantity >= medicine.quantity,
          currentStock: inventoryResponse.data.stock_quantity,
          lowStock: inventoryResponse.data.stock_quantity <= inventoryResponse.data.reorder_threshold
        };
      } catch (error) {
        console.error(`Error checking inventory for medicine ${medicine.id}:`, error);
        status[medicine.id] = { available: false, currentStock: 0, lowStock: false };
      }
    }
    setInventoryStatus(status);
  };

  const handleDispenseChange = (medicineId, quantity) => {
    setDispensedMedicines(prev => ({
      ...prev,
      [medicineId]: quantity
    }));
  };

  const handleDispense = async () => {
    setDispensing(true);
    try {
      // Update inventory for each dispensed medicine
      for (const [medicineId, quantity] of Object.entries(dispensedMedicines)) {
        if (quantity > 0) {
          await inventoryService.updateInventoryItem(medicineId, {
            stock_quantity: inventoryStatus[medicineId].currentStock - quantity
          });
        }
      }

      // Update prescription status
      await prescriptionService.dispensePrescription(id);

      navigate('/pharmacist-dashboard');
    } catch (error) {
      console.error('Error dispensing prescription:', error);
      alert('Failed to dispense prescription. Please try again.');
    } finally {
      setDispensing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Prescription Not Found</h1>
          <button
            onClick={() => navigate('/pharmacist-dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Dispense Prescription</h1>
          <button
            onClick={() => navigate('/pharmacist-dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Prescription Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Prescription Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <p className="text-gray-900">{prescription.patient_name || prescription.user?.full_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {prescription.status?.toUpperCase()}
              </span>
            </div>
          </div>

          {prescription.verified_by && (
            <div className="text-sm text-gray-600 mb-2">
              Verified by: {prescription.verified_by?.full_name}
              {prescription.verified_at && (
                <> at {new Date(prescription.verified_at).toLocaleDateString()}</>
              )}
            </div>
          )}
        </div>

        {/* Medicines to Dispense */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Medicines to Dispense</h2>

          {(prescription.prescribed_medicines || []).map((medicine, index) => {
            const medicineStatus = inventoryStatus[medicine.id] || {};
            const canDispense = medicineStatus.available && medicineStatus.currentStock >= medicine.quantity;

            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{medicine.name}</h3>
                    <p className="text-sm text-gray-600">
                      Dosage: {medicine.dosage} • Quantity: {medicine.quantity}
                    </p>
                    {medicine.instructions && (
                      <p className="text-sm text-gray-600">Instructions: {medicine.instructions}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      medicineStatus.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {medicineStatus.available ? 'Available' : 'Out of Stock'}
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      Stock: {medicineStatus.currentStock || 0}
                    </p>
                  </div>
                </div>

                {medicineStatus.available && (
                  <div className="flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">Dispense Quantity:</label>
                    <input
                      type="number"
                      min="0"
                      max={medicine.quantity}
                      value={dispensedMedicines[medicine.id] || medicine.quantity}
                      onChange={(e) => handleDispenseChange(medicine.id, parseInt(e.target.value))}
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md"
                    />
                    <span className="text-sm text-gray-600">of {medicine.quantity}</span>
                  </div>
                )}

                {!medicineStatus.available && (
                  <div className="bg-red-50 border-l-4 border-red-400 p-3">
                    <p className="text-sm text-red-700">
                      ❌ Insufficient stock to dispense this medicine
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Dispense Action */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Ready to Dispense</h3>
              <p className="text-sm text-gray-600">
                Confirm that all medicines have been dispensed correctly
              </p>
            </div>

            <button
              onClick={handleDispense}
              disabled={dispensing || Object.keys(dispensedMedicines).length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {dispensing ? 'Dispensing...' : 'Confirm Dispense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispensePrescription;
