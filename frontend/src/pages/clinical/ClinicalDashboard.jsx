import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clinicalService from '../../services/clinicalService';
import api from '../../services/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useNotification } from '../../context/NotificationContext';
import { notifyApiError } from '../../utils/notifyApiError';
import { PanelSkeleton } from '../../components/ui/Skeleton';
import PageHeader from '../../components/PageHeader';

const ClinicalDashboard = () => {
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);
  const [searchPatient, setSearchPatient] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creatingPatient, setCreatingPatient] = useState(false);

  const { data: patientsSearch, isFetching: searchingPatients } = useQuery({
    queryKey: ['patients', searchPatient],
    queryFn: async () => {
      if (searchPatient.trim().length < 2) return { results: [] };
      const res = await api.get('/patients/patients/', {
        params: { search: searchPatient.trim() },
        skipGlobalErrorNotification: true,
      });
      const payload = res.data?.results ?? res.data?.data ?? res.data ?? [];
      return { results: Array.isArray(payload) ? payload : [] };
    },
    enabled: searchPatient.trim().length >= 2,
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
      setNewFirstName('');
      setNewLastName('');
      setNewPhone('');
      notify.success('Consultation started', 'You can now record notes and prescriptions.');
    },
    onError: (err) => {
      notifyApiError(notify, err, 'Could not start', 'Failed to create the consultation. Try again.');
    },
  });

  const registerAndSelectPatient = async () => {
    const first = newFirstName.trim() || searchPatient.trim().split(/\s+/)[0] || '';
    const last =
      newLastName.trim() ||
      searchPatient.trim().split(/\s+/).slice(1).join(' ') ||
      'Patient';
    if (!first) {
      notify.warning('Name required', 'Enter the patient first name to continue.');
      return;
    }
    setCreatingPatient(true);
    try {
      const phone = newPhone.trim() || '0000000000';
      if (phone.length > 15) {
        notify.warning('Phone too long', 'Use at most 15 characters for the phone number.');
        return;
      }
      const res = await api.post(
        '/patients/patients/',
        {
          first_name: first.slice(0, 50),
          last_name: last.slice(0, 50),
          phone_number: phone,
          gender: 'PREFER_NOT_TO_SAY',
          date_of_birth: '2000-01-01',
        },
        { skipGlobalErrorNotification: true },
      );
      const patient = res.data?.data ?? res.data;
      if (!patient?.id) {
        notify.error('Registration failed', 'Server did not return a patient id. Check the patients API.');
        return;
      }
      setSelectedPatient(patient);
      notify.success('Patient registered', `${first} ${last} is ready for consultation.`);
    } catch (err) {
      notifyApiError(notify, err, 'Registration failed', 'Could not create the patient record.');
    } finally {
      setCreatingPatient(false);
    }
  };

  const handleCreate = () => {
    if (!selectedPatient?.id) {
      notify.warning('Patient required', 'Search and select a patient, or register a new one.');
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
                placeholder="Type name or phone…"
                autoFocus
                value={searchPatient}
                onChange={(e) => {
                  setSearchPatient(e.target.value);
                  setSelectedPatient(null);
                }}
              />
              {searchingPatients && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Searching…</p>
              )}

              {patientsSearch?.results?.length > 0 && !selectedPatient && (
                <div
                  className="mt-2 border rounded-lg overflow-hidden max-h-48 overflow-y-auto"
                  style={{ borderColor: 'var(--border-primary)' }}
                >
                  {patientsSearch.results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedPatient(p);
                      }}
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

            {!selectedPatient && (
              <div className="mb-4 p-3 rounded-lg border space-y-2" style={{ borderColor: 'var(--border-primary)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Or register a new patient
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    className="form-input w-full"
                    placeholder="First name"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input w-full"
                    placeholder="Last name"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  className="form-input w-full"
                  placeholder="Phone (optional)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
                <button
                  type="button"
                  onClick={registerAndSelectPatient}
                  disabled={creatingPatient || (!newFirstName.trim() && !searchPatient.trim())}
                  className="btn-primary w-full py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {creatingPatient ? 'Saving…' : 'Register & select'}
                </button>
              </div>
            )}

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
                disabled={!selectedPatient?.id || createMutation.isLoading}
                className="btn-primary px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
              >
                {createMutation.isLoading ? 'Starting…' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalDashboard;
