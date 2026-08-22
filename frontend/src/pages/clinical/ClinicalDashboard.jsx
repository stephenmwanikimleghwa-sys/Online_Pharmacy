import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clinicalService from '../../services/clinicalService';
import api from '../../services/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../../context/NotificationContext';
import { PanelSkeleton } from '../../components/ui/Skeleton';
import PageHeader from '../../components/PageHeader';

const ClinicalDashboard = () => {
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchPatient, setSearchPatient] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const { data: patientsSearch } = useQuery({
    queryKey: ['patients', searchPatient],
    queryFn: async () => {
      if (searchPatient.length < 3) return { results: [] };
      const res = await api.get(`/patients/api/patients/?search=${searchPatient}`);
      return res.data;
    },
    enabled: searchPatient.length >= 3,
  });

  const { data: consultations, isLoading } = useQuery({
    queryKey: ['consultations'],
    queryFn: clinicalService.getConsultations,
  });

  const createMutation = useMutation({
    mutationFn: clinicalService.createConsultation,
    onSuccess: () => {
      queryClient.invalidateQueries(['consultations']);
      setShowNewModal(false);
      setSelectedPatient(null);
      setSearchPatient('');
      notify.success('Consultation started', 'You can now record notes and prescriptions.');
    },
  });

  const handleCreate = () => {
    if (!selectedPatient) {
      notify.warning('Patient required', 'Select a patient before starting a consultation.');
      return;
    }
    createMutation.mutate({
      patient: selectedPatient.id,
      status: 'waiting',
      consultation_fee: 500,
    });
  };

  const statusStyle = (status) => {
    if (status === 'waiting') return { background: 'rgba(217,119,6,0.12)', color: '#b45309' };
    if (status === 'triage') return { background: 'var(--brand-mist)', color: 'var(--color-primary)' };
    if (status === 'completed') return { background: 'rgba(16,185,129,0.12)', color: '#047857' };
    return { background: 'var(--bg-field)', color: 'var(--text-secondary)' };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <PageHeader
        title="Clinical services"
        description="Patient triage, consultations, and follow-up."
        actions={
          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="btn-primary px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" /> New consultation
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <PanelSkeleton rows={6} />
        ) : (
          <div
            className="glass-card border p-2 sm:p-4"
            style={{ borderRadius: 'var(--radius-surface)', borderColor: 'var(--border-primary)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border-primary)' }}>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Date</th>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Patient</th>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                    <th className="px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Practitioner</th>
                    <th className="px-4 py-3 text-xs font-semibold text-right" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations?.results?.map((c) => (
                    <tr key={c.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-primary)' }}>
                      <td className="px-4 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {c.patient_name}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold capitalize" style={statusStyle(c.status)}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                        {c.practitioner_name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/clinical/${c.id}`}
                          className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background: 'var(--brand-mist)', color: 'var(--color-primary)' }}
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {consultations?.results?.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        No consultations in queue.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="glass-card w-full max-w-lg p-6 border"
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-surface)',
            }}
          >
            <h3 className="text-xl font-display font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Start consultation
            </h3>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Search patient
              </label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Name or phone…"
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
              />

              {patientsSearch?.results?.length > 0 && !selectedPatient && (
                <div
                  className="mt-2 border rounded-lg overflow-hidden max-h-48 overflow-y-auto"
                  style={{ borderColor: 'var(--border-primary)' }}
                >
                  {patientsSearch.results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPatient(p)}
                      className="w-full text-left px-4 py-3 border-b last:border-0 transition-colors hover:opacity-80"
                      style={{ borderColor: 'var(--border-primary)' }}
                    >
                      <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {p.first_name} {p.last_name}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {p.phone_number}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedPatient && (
              <div
                className="p-4 rounded-lg mb-4 border"
                style={{
                  background: 'rgba(16,185,129,0.08)',
                  color: '#047857',
                  borderColor: 'rgba(16,185,129,0.2)',
                }}
              >
                <span className="font-semibold block text-sm">
                  Selected: {selectedPatient.first_name} {selectedPatient.last_name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-xs underline mt-1"
                >
                  Change
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowNewModal(false)} className="form-cancel-btn px-4 py-2 rounded-lg">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!selectedPatient || createMutation.isLoading}
                className="btn-primary px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalDashboard;
