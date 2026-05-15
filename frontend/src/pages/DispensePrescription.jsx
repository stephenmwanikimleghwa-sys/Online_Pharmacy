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

      navigate('/pharmacist/dashboard');
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
            onClick={() => navigate('/pharmacist/dashboard')}
            className="mt-4 px-4 py-2 btn-primary text-white rounded-md "
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-glow">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Dispensing <span className="text-primary">Terminal</span></h1>
            </div>
            <p className="text-lg text-slate-500 font-medium">Verify stock availability and authorize medication release to patient.</p>
          </div>
          <button
            onClick={() => navigate('/pharmacist/dashboard')}
            className="px-6 py-3 bg-white text-slate-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest border border-slate-200 hover:border-indigo-500 hover:text-primary transition-all shadow-sm hover:shadow-premium"
          >
            Terminal Dashboard
          </button>
        </div>

        {/* Prescription Details Card */}
        <div className="glass-card rounded-[2.5rem] p-10 border border-white/60 shadow-premium mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 btn-primary/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-primary border border-indigo-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h2 className="text-xl font-display font-bold text-slate-900">Patient Specification</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Subject Name</p>
              <p className="text-2xl font-display font-bold text-slate-900">
                {prescription.patient_name || prescription.user?.full_name}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">System Status</p>
              <div className="flex">
                <span className="px-4 py-1.5 bg-indigo-50 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-100 shadow-sm">
                  {prescription.status}
                </span>
              </div>
            </div>
          </div>

          {prescription.verified_by && (
            <div className="mt-10 pt-8 border-t border-slate-100 flex items-center gap-4 text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <p className="text-xs font-medium">
                Authorized by <span className="font-bold text-slate-600">{prescription.verified_by?.full_name}</span>
                {prescription.verified_at && (
                  <> on <span className="font-bold text-slate-600">{new Date(prescription.verified_at).toLocaleDateString()}</span></>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Medicines Section */}
        <div className="glass-card rounded-[2.5rem] p-10 border border-white/60 shadow-premium mb-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-primary border border-indigo-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.638.319a4 4 0 01-2.154.493H8.5a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 011.929.5L13 3.5a2 2 0 011 1.732V9a2 2 0 01-2 2h-1M14 6a2 2 0 00-2 2v1M17 10a2 2 0 00-2 2v1" /></svg>
            </div>
            <h2 className="text-xl font-display font-bold text-slate-900">Release Protocol</h2>
          </div>

          <div className="space-y-6">
            {(prescription.prescribed_medicines || []).map((medicine, index) => {
              const medicineStatus = inventoryStatus[medicine.id] || {};
              const isAvailable = medicineStatus.available && medicineStatus.currentStock >= medicine.quantity;

              return (
                <div key={index} className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100/80 transition-all hover:shadow-premium group">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-display font-bold text-slate-900">{medicine.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${isAvailable ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                          {isAvailable ? 'In Stock' : 'Stock Depleted'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 font-medium mb-4 flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.638.319a4 4 0 01-2.154.493H8.5a4 4 0 01-4-4V7a4 4 0 014-4h2a4 4 0 011.929.5L13 3.5a2 2 0 011 1.732V9a2 2 0 01-2 2h-1" /></svg> Dosage: {medicine.dosage}</span>
                        <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> Req: {medicine.quantity} units</span>
                      </p>
                      {medicine.instructions && (
                        <div className="p-4 bg-white/60 rounded-xl border border-slate-100 text-xs text-slate-500 font-medium italic">
                          "{medicine.instructions}"
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-4 min-w-[200px]">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available Ledger</p>
                        <p className={`text-2xl font-display font-bold ${isAvailable ? 'text-slate-900' : 'text-rose-600'}`}>
                          {medicineStatus.currentStock || 0} <span className="text-sm font-medium text-slate-400">units</span>
                        </p>
                      </div>

                      {isAvailable && (
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
                          <input
                            type="number"
                            min="0"
                            max={medicine.quantity}
                            value={dispensedMedicines[medicine.id] || medicine.quantity}
                            onChange={(e) => handleDispenseChange(medicine.id, parseInt(e.target.value) || 0)}
                            className="w-16 px-2 py-2 text-center font-bold text-slate-700 bg-transparent focus:outline-none"
                          />
                          <div className="h-6 w-px bg-slate-100"></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase pr-2">Release</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isAvailable && (
                    <div className="mt-6 p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-center gap-3 text-rose-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      <p className="text-xs font-bold uppercase tracking-wider">Critical: Ledger stock insufficient for secure release.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Bar */}
        <div className="glass-card rounded-[2.5rem] p-8 border border-white/60 shadow-premium">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-1">Authorization Terminal</h3>
              <p className="text-sm text-slate-500 font-medium">Verify all release quantities before final ledger commitment.</p>
            </div>

            <button
              onClick={handleDispense}
              disabled={dispensing || Object.keys(dispensedMedicines).length === 0}
              className="px-10 py-5 bg-emerald-600 text-white rounded-3xl hover:bg-slate-900 shadow-glow-emerald hover:shadow-premium font-bold text-[11px] uppercase tracking-[0.2em] transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-4"
            >
              {dispensing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Commiting Release...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>Verify & Commit Release</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispensePrescription;
