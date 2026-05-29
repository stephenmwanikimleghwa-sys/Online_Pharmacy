import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import clinicalService from '../../services/clinicalService';
import api from '../../services/api';
import { HeartIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const ClinicalDashboard = () => {
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
      toast.success('Consultation started');
    }
  });

  const handleCreate = () => {
    if(!selectedPatient) return toast.error('Select a patient');
    createMutation.mutate({
      patient: selectedPatient.id,
      status: 'waiting',
      consultation_fee: 500 // Default base fee
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in text-slate-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
            <HeartIcon className="w-8 h-8 text-rose-500" />
            Clinical Services
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Manage patient triage, consultations, and lab tests.</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn-primary bg-rose-500 hover:bg-rose-600 px-5 py-2.5 rounded-xl font-bold shadow-premium flex items-center gap-2">
          <PlusIcon className="w-5 h-5" /> New Consultation
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? <div className="animate-pulse h-64 bg-slate-100 rounded-2xl"></div> : (
          <div className="glass-card rounded-[2rem] border border-white/60 shadow-premium p-6">
             <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Patient</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Practitioner</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {consultations?.results?.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 text-sm font-medium">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800">{c.patient_name}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                          ${c.status === 'waiting' ? 'bg-orange-100 text-orange-700' :
                            c.status === 'triage' ? 'bg-blue-100 text-blue-700' :
                            c.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">{c.practitioner_name || 'Unassigned'}</td>
                      <td className="px-4 py-4 text-right">
                        <Link to={`/clinical/${c.id}`} className="text-rose-500 hover:text-rose-700 font-bold text-sm bg-rose-50 px-4 py-2 rounded-lg">View Details</Link>
                      </td>
                    </tr>
                  ))}
                  {consultations?.results?.length === 0 && (
                    <tr><td colSpan="5" className="text-center py-12 text-slate-400">No consultations in queue.</td></tr>
                  )}
                </tbody>
             </table>
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-premium">
            <h3 className="text-xl font-bold mb-4">Start New Consultation</h3>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 mb-1">Search Patient</label>
              <input type="text" className="form-input w-full rounded-xl" placeholder="Name or ID..." value={searchPatient} onChange={e => setSearchPatient(e.target.value)} />
              
              {patientsSearch?.results?.length > 0 && !selectedPatient && (
                <div className="mt-2 border rounded-xl overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                  {patientsSearch.results.map(p => (
                    <button key={p.id} onClick={() => setSelectedPatient(p)} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0">
                      <div className="font-bold text-sm">{p.first_name} {p.last_name}</div>
                      <div className="text-xs text-slate-500">{p.phone_number}</div>
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
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={handleCreate} disabled={!selectedPatient || createMutation.isLoading} className="btn-primary bg-rose-500 hover:bg-rose-600 px-6 py-2 rounded-xl font-bold">Start</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalDashboard;
