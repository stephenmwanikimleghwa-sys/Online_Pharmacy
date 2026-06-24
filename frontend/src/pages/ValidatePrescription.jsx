import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { prescriptionService } from '../services/prescriptionService';
import { useNotification } from '../context/NotificationContext';

const ValidatePrescription = () => {
  const { notify } = useNotification();
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
      } finally {
      setValidating(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      notify.warning('Reason Required', 'Please provide a reason for rejecting this prescription.');
      return;
    }

    setValidating(true);
    try {
      await prescriptionService.rejectPrescription(id, rejectionReason);
  navigate('/pharmacist/dashboard');
    } catch (error) {
      } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-t-transparent" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Prescription Not Found</h1>
          <button
            onClick={() => navigate('/pharmacist/dashboard')}
            className="mt-4 btn-primary px-4 py-2 text-white rounded-xl"
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
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Validate Prescription</h1>
          <button
            onClick={() => navigate('/pharmacist/dashboard')}
            className="form-cancel-btn px-4 py-2"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Prescription Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="form-label">Patient Name</label>
              <p style={{ color: 'var(--text-primary)' }}>{prescription.user?.full_name || prescription.user?.username}</p>
            </div>
            <div>
              <label className="form-label">Upload Date</label>
              <p style={{ color: 'var(--text-primary)' }}>{new Date(prescription.uploaded_at).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="form-label">Status</label>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                prescription.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                prescription.status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                'bg-rose-50 text-rose-700 border border-rose-100'
              }`}>
                {prescription.status?.toUpperCase()}
              </span>
            </div>
          </div>

          {prescription.file_path && (
            <div className="mb-4">
              <label className="form-label">Prescription File</label>
              <a
                href={prescription.file_path}
                target="_blank"
                rel="noopener noreferrer"
                className="underline transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                View Prescription
              </a>
            </div>
          )}
        </div>

        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Inventory Check</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="data-cell">
              <label className="form-label">Availability</label>
              <p className={inventoryCheck.available ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                {inventoryCheck.available ? 'Available' : 'Out of Stock'}
              </p>
            </div>
            <div className="data-cell">
              <label className="form-label">Stock Level</label>
              <p className={!inventoryCheck.lowStock ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                {inventoryCheck.lowStock ? 'Low Stock' : 'Adequate Stock'}
              </p>
            </div>
            <div className="data-cell">
              <label className="form-label">Current Quantity</label>
              <p className="font-semibold" style={{ color: 'var(--color-primary)' }}>{inventoryCheck.quantity || 'N/A'}</p>
            </div>
          </div>

          <div className="p-4 mb-4 rounded-xl border-l-4" style={{ background: 'var(--brand-mist)', borderLeftColor: 'var(--color-primary)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Note:</strong> Check for dosage correctness, potential drug interactions,
              and ensure the prescription meets all regulatory requirements.
            </p>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Validation Actions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <button
                onClick={handleValidate}
                disabled={validating}
                className="btn-primary w-full px-4 py-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? 'Validating...' : 'Approve Prescription'}
              </button>
              <p className="text-sm mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
                Mark this prescription as valid and ready for dispensing
              </p>
            </div>

            <div>
              <div className="mb-3">
                <label className="form-label">Rejection Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="form-input resize-none"
                  rows="3"
                />
              </div>
              <button
                onClick={handleReject}
                disabled={validating || !rejectionReason.trim()}
                className="w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
