import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UserIcon, UserPlusIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition, DialogBackdrop } from '@headlessui/react';

const roleColors = {
  admin: "bg-indigo-50 text-indigo-600 border-indigo-100",
  pharmacist: "bg-emerald-50 text-emerald-600 border-emerald-100",
  customer: "bg-slate-100 text-slate-500 border-slate-200",
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
        <div className="flex flex-col items-center gap-4 opacity-40">
          <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-xl animate-spin shadow-glow-indigo"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading...</p>
        </div>
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
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-glow">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">User <span className="text-indigo-600">Management</span></h1>
          </div>
          <p className="text-lg text-slate-500 font-medium">View, create, and manage all system users and their roles.</p>
        </div>
        <button
          onClick={() => { setIsModalOpen(true); setIsEditMode(false); setEditingUserId(null); setFormData(prev => ({ ...prev, role: 'pharmacist' })); }}
          className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-premium hover:shadow-glow transition-all active:scale-[0.98] flex items-center gap-2 group"
        >
          <UserPlusIcon className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest leading-none mt-0.5">Add User</span>
        </button>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4 animate-shake">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
            <XCircleIcon className="w-5 h-5" />
          </div>
          <p className="text-rose-900 font-bold text-sm tracking-tight">{error}</p>
        </div>
      )}

      {/* Table Container */}
      <div className="glass-card rounded-[2.5rem] border border-white/60 shadow-premium overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-white/30 backdrop-blur-md flex items-center gap-3">
          <UserIcon className="h-5 w-5 text-indigo-600" />
          <h2 className="text-xl font-display font-bold text-slate-900">All Users</h2>
          <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-100 rounded-full">{users.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                {["Username", "Email", "Role", "Status", "Actions"].map(h => (
                  <th key={h} className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                        {user.username?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{user.username}</p>
                        {user.full_name && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{user.full_name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-500 font-medium">{user.email || '—'}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border shadow-sm capitalize ${roleColors[user.role] || roleColors.customer}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${user.is_verified ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_verified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {user.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(user)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm flex items-center gap-1">
                        <PencilSquareIcon className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button onClick={() => handleDelete(user)}
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100 shadow-sm flex items-center gap-1">
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

      {/* Split-Panel Modal */}
      <Transition show={isModalOpen} as={React.Fragment}>
        <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={() => setIsModalOpen(false)}>
          <div className="min-h-screen flex items-center justify-center px-4">
            <DialogBackdrop className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <div className="relative z-10 w-full max-w-2xl bg-white rounded-[2.5rem] shadow-premium overflow-hidden flex flex-col md:flex-row animate-scale-up border-[8px] border-white ring-1 ring-slate-200">
              {/* Visual Panel */}
              <div className="md:w-1/3 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div>
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-glow-indigo">
                    {isEditMode ? <PencilSquareIcon className="w-6 h-6" /> : <UserPlusIcon className="w-6 h-6" />}
                  </div>
                  <h2 className="text-3xl font-display font-bold leading-tight">
                    {isEditMode ? 'Edit User' : `Add New ${formData.role === 'admin' ? 'Admin' : 'Pharmacist'}`}
                  </h2>
                  <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">
                    {isEditMode
                      ? 'Update this user\'s details and access permissions.'
                      : 'Create a new user account with the appropriate role and permissions.'}
                  </p>
                </div>
                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em] opacity-40 mt-8">Access Control</div>
              </div>

              {/* Form Panel */}
              <form onSubmit={handleSubmit} className="md:w-2/3 p-10 bg-slate-50/30 overflow-y-auto max-h-[85vh]">
                <div className="space-y-6">
                  {formFields.map(({ name, label, type, required }) => (
                    <div key={name}>
                      <label htmlFor={name} className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">{label}</label>
                      <input
                        type={type}
                        name={name}
                        id={name}
                        required={required}
                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                        value={formData[name]}
                        onChange={handleChange}
                      />
                    </div>
                  ))}
                  <div>
                    <label htmlFor="role" className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Role</label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm appearance-none"
                    >
                      <option value="pharmacist">Pharmacist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 font-bold text-xs uppercase tracking-widest transition-all">
                    Cancel
                  </button>
                  <button type="submit"
                    className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 shadow-premium hover:shadow-glow font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98]">
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
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white border border-emerald-100 text-emerald-700 px-5 py-3.5 rounded-2xl shadow-premium text-sm font-bold animate-slide-up">
          <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default ManageUsers;