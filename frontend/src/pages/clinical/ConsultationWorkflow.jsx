import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clinicalService from '../../services/clinicalService';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, BanknotesIcon, CheckCircleIcon, DocumentTextIcon, BeakerIcon } from '@heroicons/react/24/outline';

const ConsultationWorkflow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: consultation, isLoading } = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => clinicalService.getConsultation(id)
  });

  const [vitals, setVitals] = useState({
    temperature: '',
    blood_pressure_systolic: '',
    blood_pressure_diastolic: '',
    weight: '',
    spo2: '',
    triage_notes: ''
  });

  const [clinicalData, setClinicalData] = useState({
    symptoms: '',
    diagnosis: '',
    treatment_plan: ''
  });

  // Pre-fill states once data loads
  React.useEffect(() => {
    if (consultation) {
      setVitals({
        temperature: consultation.temperature || '',
        blood_pressure_systolic: consultation.blood_pressure_systolic || '',
        blood_pressure_diastolic: consultation.blood_pressure_diastolic || '',
        weight: consultation.weight || '',
        spo2: consultation.spo2 || '',
        triage_notes: consultation.triage_notes || ''
      });
      setClinicalData({
        symptoms: consultation.symptoms || '',
        diagnosis: consultation.diagnosis || '',
        treatment_plan: consultation.treatment_plan || ''
      });
    }
  }, [consultation]);

  const updateMutation = useMutation({
    mutationFn: (data) => clinicalService.updateConsultation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['consultation', id]);
      toast.success('Consultation updated');
    }
  });

  const billMutation = useMutation({
    mutationFn: (mode) => clinicalService.billToOTC(id, mode),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['consultation', id]);
      toast.success('Billed to OTC Sales successfully!');
      navigate(`/otc-sales`); // Redirect to OTC or leave them here
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to bill')
  });

  const handleSaveTriage = () => {
    updateMutation.mutate({ ...vitals, status: 'consultation' });
  };

  const handleSaveClinical = () => {
    updateMutation.mutate({ ...clinicalData, status: 'completed' });
  };

  const handleBill = () => {
    if(window.confirm('Bill this consultation to OTC Sales?')) {
      billMutation.mutate('CASH');
    }
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!consultation) return <div className="p-8 text-center">Consultation not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in text-slate-800">
      <button onClick={() => navigate('/clinical')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 font-bold text-sm">
        <ArrowLeftIcon className="w-4 h-4" /> Back to Queue
      </button>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Consultation: {consultation.patient_name}
          </h1>
          <p className="text-slate-500 text-sm">Status: <span className="font-bold uppercase">{consultation.status}</span></p>
        </div>
        
        {consultation.status === 'completed' && !consultation.is_paid && (
          <button onClick={handleBill} disabled={billMutation.isLoading} className="btn-primary bg-emerald-500 hover:bg-emerald-600 px-6 py-2 rounded-xl font-bold flex items-center gap-2">
            <BanknotesIcon className="w-5 h-5" /> Bill to OTC
          </button>
        )}
        {consultation.is_paid && (
          <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5" /> Billed
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Triage Section */}
        <div className="glass-card p-6 rounded-3xl border border-white/60 shadow-sm">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-rose-500"><HeartIcon className="w-5 h-5"/> Vitals (Triage)</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Temp (°C)</label>
              <input type="number" step="0.1" className="form-input w-full rounded-xl" value={vitals.temperature} onChange={e => setVitals({...vitals, temperature: e.target.value})} disabled={consultation.is_paid} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Weight (kg)</label>
              <input type="number" step="0.1" className="form-input w-full rounded-xl" value={vitals.weight} onChange={e => setVitals({...vitals, weight: e.target.value})} disabled={consultation.is_paid} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">BP Systolic</label>
              <input type="number" className="form-input w-full rounded-xl" value={vitals.blood_pressure_systolic} onChange={e => setVitals({...vitals, blood_pressure_systolic: e.target.value})} disabled={consultation.is_paid} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">BP Diastolic</label>
              <input type="number" className="form-input w-full rounded-xl" value={vitals.blood_pressure_diastolic} onChange={e => setVitals({...vitals, blood_pressure_diastolic: e.target.value})} disabled={consultation.is_paid} />
            </div>
          </div>
          <div className="mb-4">
             <label className="block text-xs font-bold text-slate-500 mb-1">SpO2 (%)</label>
             <input type="number" className="form-input w-full rounded-xl" value={vitals.spo2} onChange={e => setVitals({...vitals, spo2: e.target.value})} disabled={consultation.is_paid} />
          </div>
          
          <div className="mb-4">
             <label className="block text-xs font-bold text-slate-500 mb-1">Triage Notes</label>
             <textarea className="form-input w-full rounded-xl" rows="2" value={vitals.triage_notes} onChange={e => setVitals({...vitals, triage_notes: e.target.value})} disabled={consultation.is_paid}></textarea>
          </div>
          
          {!consultation.is_paid && (
            <button onClick={handleSaveTriage} disabled={updateMutation.isLoading} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-colors">Save Vitals</button>
          )}
        </div>

        {/* Clinical Section */}
        <div className="glass-card p-6 rounded-3xl border border-white/60 shadow-sm">
           <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-500"><DocumentTextIcon className="w-5 h-5"/> Clinical Notes</h2>
           
           <div className="mb-4">
             <label className="block text-xs font-bold text-slate-500 mb-1">Symptoms</label>
             <textarea className="form-input w-full rounded-xl" rows="3" value={clinicalData.symptoms} onChange={e => setClinicalData({...clinicalData, symptoms: e.target.value})} disabled={consultation.is_paid}></textarea>
           </div>
           
           <div className="mb-4">
             <label className="block text-xs font-bold text-slate-500 mb-1">Diagnosis</label>
             <textarea className="form-input w-full rounded-xl" rows="2" value={clinicalData.diagnosis} onChange={e => setClinicalData({...clinicalData, diagnosis: e.target.value})} disabled={consultation.is_paid}></textarea>
           </div>
           
           <div className="mb-4">
             <label className="block text-xs font-bold text-slate-500 mb-1">Treatment Plan / Prescription Notes</label>
             <textarea className="form-input w-full rounded-xl" rows="2" value={clinicalData.treatment_plan} onChange={e => setClinicalData({...clinicalData, treatment_plan: e.target.value})} disabled={consultation.is_paid}></textarea>
           </div>

           {!consultation.is_paid && (
             <button onClick={handleSaveClinical} disabled={updateMutation.isLoading} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 rounded-xl transition-colors shadow-md">Complete Consultation</button>
           )}
        </div>

      </div>
    </div>
  );
};

export default ConsultationWorkflow;
