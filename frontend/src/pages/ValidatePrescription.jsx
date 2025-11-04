import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { prescriptionService } from '../services/prescriptionService';

const ValidatePrescription = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [inventoryCheck, setInventoryCheck] = useState({});

  useEffect(() => {
    fetchPrescription();
  }, [id]);

  const fetchPrescription = async () => {
    try {
      const response = await prescriptionService.getPrescription(id);
      setPrescription(response.data);
      // Check inventory for prescribed medicines
      await checkInventory(response.data);
    } catch (error) {
      console.error('Error fetching prescription:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkInventory = async (prescriptionData) => {
    // This would be implemented with actual inventory service calls
    // For now, we'll simulate inventory checks
    const inventoryStatus = {
      available: Math.random() > 0.3, // 70% chance available
      lowStock: Math.random() > 0.7, // 30% chance low stock
      quantity: Math.floor(Math.random() * 100) + 1
    };
    setInventoryCheck(inventoryStatus);
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      await prescriptionService.validatePrescription(id, 'Prescription validated by pharmacist');
  navigate('/pharmacist/dashboard');
    } catch (error) {
      console.error('Error validating prescription:', error);
    } finally {
      setValidating(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setValidating(true);
    try {
      await prescriptionService.rejectPrescription(id, rejectionReason);
  navigate('/pharmacist/dashboard');
    } catch (error) {
      console.error('Error rejecting prescription:', error);
    } finally {
      setValidating(false);
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
            onClick={() => navigate('/pharmacist/dashboard')}
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
          <h1 className="text-3xl font-bold text-gray-800">Validate Prescription</h1>
          <button
            onClick={() => navigate('/pharmacist/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Prescription Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Patient Name</label>
              <p className="text-gray-900">{prescription.user?.full_name || prescription.user?.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Upload Date</label>
              <p className="text-gray-900">{new Date(prescription.uploaded_at).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                prescription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                prescription.status === 'verified' ? 'bg-green-100 text-green-800' :
                'bg-red-100 text-red-800'
              }`}>
                {prescription.status?.toUpperCase()}
              </span>
            </div>
          </div>

          {prescription.file_path && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Prescription File</label>
              <a
                href={prescription.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                View Prescription
              </a>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Inventory Check</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className={`p-4 rounded-lg ${
              inventoryCheck.available ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <label className="block text-sm font-medium text-gray-700">Availability</label>
              <p className={inventoryCheck.available ? 'text-green-800' : 'text-red-800'}>
                {inventoryCheck.available ? 'Available' : 'Out of Stock'}
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              !inventoryCheck.lowStock ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              <label className="block text-sm font-medium text-gray-700">Stock Level</label>
              <p className={!inventoryCheck.lowStock ? 'text-green-800' : 'text-yellow-800'}>
                {inventoryCheck.lowStock ? 'Low Stock' : 'Adequate Stock'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-blue-100">
              <label className="block text-sm font-medium text-gray-700">Current Quantity</label>
              <p className="text-blue-800">{inventoryCheck.quantity || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Note:</strong> Check for dosage correctness, potential drug interactions,
                  and ensure the prescription meets all regulatory requirements.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Validation Actions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <button
                onClick={handleValidate}
                disabled={validating}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? 'Validating...' : 'Approve Prescription'}
              </button>
              <p className="text-sm text-gray-600 mt-2 text-center">
                Mark this prescription as valid and ready for dispensing
              </p>
            </div>

            <div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows="3"
                />
              </div>
              <button
                onClick={handleReject}
                disabled={validating || !rejectionReason.trim()}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? 'Rejecting...' : 'Reject Prescription'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidatePrescription;
