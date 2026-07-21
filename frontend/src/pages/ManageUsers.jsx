import React, { useState } from 'react';
import api from '../services/api';
import { UserIcon, UserPlusIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition, DialogBackdrop } from '@headlessui/react';
import { useUsers } from '../hooks/useUsers';
import { useBranches } from '../hooks/useBranches';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import RefreshIndicator from '../components/ui/RefreshIndicator';
import { queryClient } from '../lib/queryClient';
import { QUERY_KEYS } from '../lib/queryKeys';
import { unwrapList } from '../utils/parseApiData';

const DEFAULT_PERMISSION_FLAGS = {
  can_manage_users: false,
  can_manage_inventory: false,
  can_view_reports: false,
  can_edit_prices: false,
  can_transfer_stock: false,
};

const PERMISSION_OPTIONS = [
  { key: 'can_manage_users', label: 'Manage users' },
  { key: 'can_manage_inventory', label: 'Manage inventory' },
  { key: 'can_view_reports', label: 'View reports' },
  { key: 'can_edit_prices', label: 'Edit prices' },
  { key: 'can_transfer_stock', label: 'Transfer stock (see other-branch quantities)' },
];

const getRoleStyle = (role) => {
  if (role === 'admin') return { background: 'var(--brand-mist)', color: 'var(--color-primary)', borderColor: 'var(--brand-border-soft)' };
  if (role === 'pharmacist') return { background: 'rgba(16,185,129,0.08)', color: '#059669', borderColor: 'rgba(16,185,129,0.18)' };
  return { background: 'var(--bg-field)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' };
};

const ManageUsers = () => {
  const {
    data: users = [],
    isLoading,
    isFetching,
    error: usersError,
    refetch,
  } = useUsers();
  const { data: branchesRaw } = useBranches();
  const branches = unwrapList(branchesRaw?.results ?? branchesRaw);
  const [actionError, setActionError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [resetCandidate, setResetCandidate] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'active', 'inactive', 'all'
  const [formData, setFormData] = useState({
    username: '', password: '', email: '', full_name: '', pharmacy_license: '', role: 'pharmacist', branch_id: ''
  });
  const [permissionFlags, setPermissionFlags] = useState({ ...DEFAULT_PERMISSION_FLAGS });

  useDocumentTitle('User Management');

  const invalidateUsers = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 opacity-40">
          <div className="w-10 h-10 border-[3px] border-t-transparent rounded-xl animate-spin"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}></div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-medium text-red-600">Failed to load users.</p>
        <button type="button" className="btn-primary px-4 py-2 rounded-xl text-sm" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        permission_flags: permissionFlags,
      };
      if (isEditMode && editingUserId) {
        await api.patch(`/auth/admin/users/${editingUserId}/`, {
          first_name: formData.full_name.split(' ')[0] || '',
          last_name: formData.full_name.split(' ').slice(1).join(' ') || '',
          email: formData.email,
          role: formData.role,
          branch_id: formData.branch_id || null,
          permission_flags: permissionFlags,
          is_verified: true,
        });
        setSuccessMessage('User updated successfully');
      } else {
        await api.post('/auth/admin/users/create/', payload);
        setSuccessMessage(`${formData.role === 'admin' ? 'Admin' : 'Pharmacist'} created successfully`);
      }
      setIsModalOpen(false); setIsEditMode(false); setEditingUserId(null);
      invalidateUsers();
      setFormData({ username: '', password: '', email: '', full_name: '', pharmacy_license: '', role: 'pharmacist', branch_id: '' });
      setPermissionFlags({ ...DEFAULT_PERMISSION_FLAGS });
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      const data = err.response?.data;
      const serverMsg = data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : null);
      setActionError('Failed to save user: ' + (serverMsg || err.message));
    }
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handlePermissionToggle = (name) => setPermissionFlags(prev => ({ ...prev, [name]: !prev[name] }));

  const handleEdit = (user) => {
    setIsEditMode(true); setEditingUserId(user.id);
    setFormData({ username: user.username, password: '', email: user.email || '', full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(), pharmacy_license: '', role: user.role || 'customer', branch_id: user.branch || '' });
    setPermissionFlags({
      ...DEFAULT_PERMISSION_FLAGS,
      can_manage_users: Boolean(user.permission_flags?.can_manage_users ?? user.can_manage_users),
      can_manage_inventory: Boolean(user.permission_flags?.can_manage_inventory ?? user.can_manage_inventory),
      can_view_reports: Boolean(user.permission_flags?.can_view_reports ?? user.can_view_reports),
      can_edit_prices: Boolean(user.permission_flags?.can_edit_prices ?? user.can_edit_prices),
      can_transfer_stock: Boolean(user.permission_flags?.can_transfer_stock ?? user.can_transfer_stock),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (user) => {
    setDeleteCandidate(user);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await api.delete(`/auth/admin/users/${deleteCandidate.id}/delete/`);
      setSuccessMessage('User deleted successfully');
      invalidateUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
      setDeleteCandidate(null);
    } catch (err) {
      const data = err.response?.data;
      const serverMsg = data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : null);
      setActionError('Failed to delete user: ' + (serverMsg || err.message));
    }
  };

  const handleReactivate = async (user) => {
    try {
      await api.post(`/auth/admin/users/${user.id}/deactivate/`);
      setSuccessMessage('User reactivated successfully');
      invalidateUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      const data = err.response?.data;
      const serverMsg = data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : null);
      setActionError('Failed to update user status: ' + (serverMsg || err.message));
    }
  };

  const handleResetPassword = (user) => {
    setResetCandidate(user);
    setResetPassword('');
  };

  const confirmResetPassword = async () => {
    if (!resetCandidate || !resetPassword.trim()) return;
    try {
      await api.post(`/auth/admin/users/${resetCandidate.id}/reset-password/`, { new_password: resetPassword.trim() });
      setSuccessMessage('Password reset successfully');
      setTimeout(() => setSuccessMessage(''), 4000);
      setResetCandidate(null);
      setResetPassword('');
    } catch (err) {
      const data = err.response?.data;
      const serverMsg = data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : null);
      setActionError('Failed to reset password: ' + (serverMsg || err.message));
    }
  };

  const formFields = [
    { name: "username", label: "Username", type: "text", required: true },
    { name: "password", label: "Password", type: "password", required: !isEditMode },
    { name: "email", label: "Email Address", type: "email", required: true },
    { name: "full_name", label: "Full Name", type: "text", required: true },
    { name: "pharmacy_license", label: "Pharmacy License", type: "text", required: false },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              User <span style={{ color: 'var(--color-primary)' }}>Management</span>
            </h1>
            <RefreshIndicator isFetching={isFetching} isLoading={isLoading} />
          </div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>View, create, and manage all system users and their roles.</p>
        </div>
        <button
          onClick={() => { setIsModalOpen(true); setIsEditMode(false); setEditingUserId(null); setFormData(prev => ({ ...prev, role: 'pharmacist' })); }}
          className="btn-primary px-6 py-3.5 text-white rounded-2xl transition-all active:scale-[0.98] flex items-center gap-2 group"
        >
          <UserPlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest leading-none mt-0.5">Add User</span>
        </button>
      </div>

      {actionError && (
        <div className="mb-8 p-4 rounded-2xl flex items-center gap-4 animate-shake"
          style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}>
            <XCircleIcon className="w-5 h-5" />
          </div>
          <p className="font-bold text-sm tracking-tight" style={{ color: '#be123c' }}>{typeof actionError === 'string' ? actionError : (actionError?.message || JSON.stringify(actionError))}</p>
        </div>
      )}

      {/* Table Container */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden">
        <div className="table-header-row px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <UserIcon className="h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>All Users</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ background: 'var(--bg-field)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}>
              {users.length} total
            </span>
          </div>
          
          <div className="flex p-1 rounded-xl border" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
            {['active', 'inactive', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  filterStatus === status ? 'shadow-sm text-primary' : ''
                }`}
                style={filterStatus === status ? { background: 'var(--bg-card)' } : { color: 'var(--text-secondary)' }}
              >
                {status === 'all' ? 'All' : `${status} Staff`}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: 'var(--bg-field)' }}>
                {["Username", "Email", "Role", "Status", "Actions"].map(h => (
                  <th key={h} className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid var(--border-primary)' }}>
              {users.filter(u => filterStatus === 'all' || (filterStatus === 'active' ? u.is_active : !u.is_active)).map((user) => (
                <tr key={user.id} className={`group transition-colors ${!user.is_active ? 'opacity-75' : ''}`}
                  style={{ borderBottom: '1px solid var(--border-primary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-mist)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full btn-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold transition-colors" style={{ color: 'var(--text-primary)' }}>{user.username}</p>
                        {user.full_name && <p className="text-[10px] font-bold uppercase tracking-tight mt-0.5" style={{ color: 'var(--text-secondary)' }}>{user.full_name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{user.email || '—'}</td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border shadow-sm capitalize"
                      style={getRoleStyle(user.role)}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {user.is_active ? (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${user.is_verified ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.is_verified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {user.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border" style={{ background: 'var(--bg-field)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-secondary)' }} />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(user)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border shadow-sm flex items-center gap-1"
                        style={{ background: 'var(--brand-mist)', color: 'var(--color-primary)', borderColor: 'var(--brand-border-soft)' }}>
                        <PencilSquareIcon className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button onClick={() => handleResetPassword(user)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border shadow-sm flex items-center gap-1"
                        style={{ background: 'rgba(59,130,246,0.08)', color: '#2563eb', borderColor: 'rgba(59,130,246,0.18)' }}>
                        Reset Password
                      </button>
                      {user.is_active ? (
                        <button onClick={() => handleDelete(user)}
                          className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-amber-100 transition-all border border-amber-100 shadow-sm flex items-center gap-1">
                          <TrashIcon className="h-3.5 w-3.5" /> Delete
                        </button>
                      ) : (
                        <button onClick={() => handleReactivate(user)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm flex items-center gap-1">
                          <CheckCircleIcon className="h-3.5 w-3.5" /> Reactivate Account
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Split-Panel Modal */}
      <Transition show={isModalOpen} as={React.Fragment}>
        <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={() => setIsModalOpen(false)}>
          <div className="min-h-screen flex items-center justify-center px-4">
            <DialogBackdrop className="fixed inset-0 modal-overlay" />
            <div className="relative z-10 w-full max-w-2xl modal-card overflow-hidden flex flex-col md:flex-row animate-scale-up">
              {/* Visual Panel */}
              <div className="modal-header md:w-1/3 flex flex-col justify-between" style={{ borderRadius: '24px 0 0 24px' }}>
                <div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                    {isEditMode ? <PencilSquareIcon className="w-6 h-6 text-white" /> : <UserPlusIcon className="w-6 h-6 text-white" />}
                  </div>
                  <h2 className="text-3xl font-display font-bold leading-tight text-white">
                    {isEditMode ? 'Edit User' : `Add New ${formData.role === 'admin' ? 'Admin' : 'Pharmacist'}`}
                  </h2>
                  <p className="text-white/60 text-sm mt-4 font-medium leading-relaxed">
                    {isEditMode
                      ? "Update this user's details and access permissions."
                      : 'Create a new user account with the appropriate role and permissions.'}
                  </p>
                </div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mt-8">Access Control</div>
              </div>

              {/* Form Panel */}
              <form onSubmit={handleSubmit} className="md:w-2/3 p-10 overflow-y-auto max-h-[85vh]"
                style={{ background: 'var(--bg-card)' }}>
                <div className="space-y-6">
                  {formFields.map(({ name, label, type, required }) => (
                    <div key={name}>
                      <label htmlFor={name} className="form-label">{label}</label>
                      <input
                        type={type}
                        name={name}
                        id={name}
                        required={required}
                        className="form-input"
                        value={formData[name]}
                        onChange={handleChange}
                      />
                    </div>
                  ))}
                  <div>
                    <label htmlFor="role" className="form-label">Role</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="form-input appearance-none"
                    >
                      <option value="pharmacist">Pharmacist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="branch_id" className="form-label">Branch</label>
                    <select id="branch_id" name="branch_id" value={formData.branch_id} onChange={handleChange} className="form-input appearance-none">
                      <option value="">No branch assigned</option>
                      {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                    </select>
                  </div>
                  <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-field)' }}>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] mb-3" style={{ color: 'var(--text-secondary)' }}>Permission Flags</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {PERMISSION_OPTIONS.map(({ key, label }) => (
                        <label key={key} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--border-primary)', color: 'var(--text-primary)', background: 'var(--bg-card)' }}>
                          <span>{label}</span>
                          <input type="checkbox" checked={Boolean(permissionFlags[key])} onChange={() => handlePermissionToggle(key)} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" style={{ borderColor: 'var(--border-primary)' }} />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="form-cancel-btn flex-1">
                    Cancel
                  </button>
                  <button type="submit"
                    className="btn-primary flex-[2] px-6 py-4 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98]">
                    {isEditMode ? 'Save Changes' : `Add ${formData.role === 'admin' ? 'Admin' : 'Pharmacist'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition show={Boolean(deleteCandidate)} as={React.Fragment}>
        <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={() => setDeleteCandidate(null)}>
          <div className="min-h-screen flex items-center justify-center px-4">
            <DialogBackdrop className="fixed inset-0 modal-overlay" />
            <div className="relative z-10 w-full max-w-md modal-card p-6 border-t-4 border-amber-500">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <TrashIcon className="h-6 w-6 text-amber-500" />
                Delete Account
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Delete <strong>{deleteCandidate?.username}</strong>? This will permanently deactivate their access, but all their records and history will be preserved in the system.
              </p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setDeleteCandidate(null)} className="form-cancel-btn px-4 py-2 rounded-xl">Cancel</button>
                <button type="button" onClick={confirmDelete} className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors">Delete</button>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition show={Boolean(resetCandidate)} as={React.Fragment}>
        <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={() => setResetCandidate(null)}>
          <div className="min-h-screen flex items-center justify-center px-4">
            <DialogBackdrop className="fixed inset-0 modal-overlay" />
            <div className="relative z-10 w-full max-w-md modal-card p-6">
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Reset Password</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Set a new password for <strong>{resetCandidate?.username}</strong>.
              </p>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="form-input w-full mb-6"
                placeholder="Enter new password"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setResetCandidate(null)} className="form-cancel-btn px-4 py-2 rounded-xl">Cancel</button>
                <button type="button" onClick={confirmResetPassword} className="btn-primary px-4 py-2 rounded-xl text-white font-semibold">Reset</button>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3.5 rounded-2xl shadow-premium text-sm font-bold animate-slide-up"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(16,185,129,0.25)', color: '#059669', backdropFilter: 'blur(12px)' }}>
          <CheckCircleIcon className="h-5 w-5" style={{ color: '#10b981' }} />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default ManageUsers;