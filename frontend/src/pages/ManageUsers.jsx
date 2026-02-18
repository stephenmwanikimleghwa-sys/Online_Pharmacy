import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UserIcon, UserPlusIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition, DialogBackdrop } from '@headlessui/react';

const inputClass = "w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all";
const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

const roleColors = {
  admin: "bg-primary-50 text-primary-700 border-primary-100",
  pharmacist: "bg-secondary-50 text-secondary-700 border-secondary-100",
  customer: "bg-slate-100 text-slate-600 border-slate-200",
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    username: '', password: '', email: '', full_name: '', pharmacy_license: '', role: 'pharmacist'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/admin/users/');
      setUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode && editingUserId) {
        await api.patch(`/auth/admin/users/${editingUserId}/`, {
          first_name: formData.full_name.split(' ')[0] || '',
          last_name: formData.full_name.split(' ').slice(1).join(' ') || '',
          email: formData.email, role: formData.role, is_verified: true
        });
        setSuccessMessage('User updated successfully');
      } else {
        await api.post('/auth/admin/users/create/', formData);
        setSuccessMessage(`${formData.role === 'admin' ? 'Admin' : 'Pharmacist'} created successfully`);
      }
      setIsModalOpen(false); setIsEditMode(false); setEditingUserId(null);
      await fetchUsers();
      setFormData({ username: '', password: '', email: '', full_name: '', pharmacy_license: '', role: 'pharmacist' });
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      setError('Failed to save user: ' + (serverMsg || err.message));
    }
  };

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleEdit = (user) => {
    setIsEditMode(true); setEditingUserId(user.id);
    setFormData({ username: user.username, password: '', email: user.email || '', full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(), pharmacy_license: '', role: user.role || 'customer' });
    setIsModalOpen(true);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user ${user.username}?`)) return;
    try {
      await api.delete(`/auth/admin/users/${user.id}/delete/`);
      setSuccessMessage('User deleted successfully');
      await fetchUsers();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      setError('Failed to delete user: ' + (serverMsg || err.message));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">User Management</h1>
          <p className="mt-1 text-slate-500">View and manage all system users.</p>
        </div>
        <button
          onClick={() => { setIsModalOpen(true); setIsEditMode(false); setEditingUserId(null); setFormData(prev => ({ ...prev, role: 'pharmacist' })); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-[0_4px_20px_rgba(79,70,229,0.35)] hover:shadow-[0_6px_28px_rgba(79,70,229,0.45)] hover:scale-[1.02] transition-all"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <UserPlusIcon className="h-4 w-4" />
          Add User
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-2 text-sm">
          <XCircleIcon className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <UserIcon className="h-5 w-5 text-primary-500" />
          <h2 className="font-display font-bold text-slate-800">All Users</h2>
          <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{users.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                {["Username", "Email", "Role", "Status", "Actions"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{user.username}</div>
                        {user.full_name && <div className="text-xs text-slate-400">{user.full_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.email || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${roleColors[user.role] || roleColors.customer}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${user.is_verified ? 'bg-secondary-50 text-secondary-600 border border-secondary-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_verified ? 'bg-secondary-500' : 'bg-amber-500'}`} />
                      {user.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(user)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-100 transition-all">
                        <PencilSquareIcon className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button onClick={() => handleDelete(user)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 transition-all">
                        <TrashIcon className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Transition show={isModalOpen} as={React.Fragment}>
        <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={() => setIsModalOpen(false)}>
          <div className="min-h-screen flex items-center justify-center px-4">
            <DialogBackdrop className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-premium border border-white/70 p-8 animate-slide-up">
              <h3 className="text-xl font-display font-bold text-slate-900 mb-6">
                {isEditMode ? 'Edit User' : `Add New ${formData.role === 'admin' ? 'Admin' : 'Pharmacist'}`}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { name: "username", label: "Username", type: "text", required: true },
                  { name: "password", label: "Password", type: "password", required: !isEditMode },
                  { name: "email", label: "Email", type: "email", required: true },
                  { name: "full_name", label: "Full Name", type: "text", required: true },
                  { name: "pharmacy_license", label: "Pharmacy License (optional)", type: "text", required: false },
                ].map(({ name, label, type, required }) => (
                  <div key={name}>
                    <label htmlFor={name} className={labelClass}>{label}</label>
                    <input type={type} name={name} id={name} required={required} className={inputClass} value={formData[name]} onChange={handleChange} />
                  </div>
                ))}
                <div>
                  <label htmlFor="role" className={labelClass}>Role</label>
                  <select id="role" name="role" value={formData.role} onChange={handleChange} className={inputClass}>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold shadow-[0_4px_20px_rgba(79,70,229,0.35)] hover:scale-[1.01] transition-all"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                    {isEditMode ? 'Save Changes' : `Add ${formData.role === 'admin' ? 'Admin' : 'Pharmacist'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Toast */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white border border-secondary-100 text-secondary-700 px-5 py-3.5 rounded-2xl shadow-premium text-sm font-semibold animate-slide-up">
          <CheckCircleIcon className="h-5 w-5 text-secondary-500" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default ManageUsers;