import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import clinicalService from '../../services/clinicalService';
import api from '../../services/api';
import { HeartIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../../context/NotificationContext';
import { PanelSkeleton } from '../../components/ui/Skeleton';

const ClinicalDashboard = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchPatient, setSearchPatient] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const { data: patientsSearch } = useQuery({
    queryKey: ['patients', searchPatient],
    queryFn: async () => {
      if(searchPatient.length < 3) return {results: []};
      const res = await api.get(`/patients/api/patients/?search=${searchPatient}`);
      return res.data;
    },
    enabled: searchPatient.length >= 3
  });

  const { data: consultations, isLoading } = useQuery({
    queryKey: ['consultations'],
    queryFn: clinicalService.getConsultations
  });

  const createMutation = useMutation({
    mutationFn: clinicalService.createConsultation,
    onSuccess: () => {
      queryClient.invalidateQueries(['consultations']);
      setShowNewModal(false);
      setSelectedPatient(null);
      setSearchPatient('');
      notify.success('Consultation Started', 'You can now record notes and prescriptions.');
    }
  });

  const handleCreate = () => {
    if(!selectedPatient) {
      notify.warning('Patient Required', 'Select a patient before starting a consultation.');
      return;
    }
    createMutation.mutate({
      patient: selectedPatient.id,
      status: 'waiting',
      consultation_fee: 500 // Default base fee
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <HeartIcon className="w-8 h-8 text-rose-500" />
            Clinical Services
          </h1>
          <p className="mt-1 font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>Manage patient triage, consultations, and lab tests.</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary bg-rose-500 hover:bg-rose-600 px-5 py-2.5 rounded-xl font-bold shadow-premium flex items-center gap-2">
          <PlusIcon className="w-5 h-5" /> New Consultation
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? <PanelSkeleton rows={6} /> : (
          <div className="glass-card rounded-[2rem] border shadow-premium p-6" style={{ borderColor: 'var(--border-primary)' }}>
             <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Patient</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>Practitioner</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-right" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations?.results?.map(c => (
                    <tr key={c.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-primary)' }}>
                      <td className="px-4 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.patient_name}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                          ${c.status === 'waiting' ? 'bg-orange-100 text-orange-700' :
                            c.status === 'triage' ? 'bg-blue-100 text-blue-700' :
                            c.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>{c.practitioner_name || 'Unassigned'}</td>
                      <td className="px-4 py-4 text-right">
                        <Link to={`/clinical/${c.id}`} className="text-rose-500 hover:text-rose-700 font-bold text-sm px-4 py-2 rounded-lg" style={{ background: 'rgba(244,63,94,0.12)' }}>View Details</Link>
                      </td>
                    </tr>
                  ))}
                  {consultations?.results?.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>No consultations in queue.</td></tr>
                  )}
                </tbody>
             </table>
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card w-full max-w-lg rounded-3xl p-6 shadow-premium border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Start New Consultation</h3>

            <div className="mb-4">
              <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Search Patient</label>
              <input type="text" className="form-input w-full rounded-xl" placeholder="Name or ID..." value={searchPatient} onChange={e => setSearchPatient(e.target.value)} />

              {patientsSearch?.results?.length > 0 && !selectedPatient && (
                <div className="mt-2 border rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto" style={{ borderColor: 'var(--border-primary)' }}>
                  {patientsSearch.results.map(p => (
                    <button key={p.id} onClick={() => setSelectedPatient(p)} className="w-full text-left px-4 py-3 border-b last:border-0 transition-colors hover:opacity-80" style={{ borderColor: 'var(--border-primary)' }}>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{p.first_name} {p.last_name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{p.phone_number}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedPatient && (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl mb-4 border border-emerald-100">
                <span className="font-bold block text-sm">Selected: {selectedPatient.first_name} {selectedPatient.last_name}</span>
                <button onClick={() => setSelectedPatient(null)} className="text-xs text-emerald-600 underline mt-1">Change</button>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)} className="form-cancel-btn px-4 py-2 rounded-xl">Cancel</button>
              <button onClick={handleCreate} disabled={!selectedPatient || createMutation.isLoading} className="btn-primary bg-rose-500 hover:bg-rose-600 px-6 py-2 rounded-xl font-bold">Start</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalDashboard;
