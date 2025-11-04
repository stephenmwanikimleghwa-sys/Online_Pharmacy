import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { UserIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition, DialogBackdrop } from '@headlessui/react';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    pharmacy_license: '',
    role: 'pharmacist'
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/auth/admin/users/');
        setUsers(response.data);
      } catch (err) {
        setError('Failed to load users');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditMode && editingUserId) {
        // Update existing user
        await api.patch(`/auth/admin/users/${editingUserId}/`, {
          first_name: formData.full_name.split(' ')[0] || '',
          last_name: formData.full_name.split(' ').slice(1).join(' ') || '',
          email: formData.email,
          role: formData.role,
          is_verified: true
        });
        setSuccessMessage('User updated successfully');
      } else {
        // Create new user
        await api.post('/auth/admin/users/create/', formData);
        setSuccessMessage(`${formData.role === 'admin' ? 'Admin' : 'Pharmacist'} created successfully`);
      }
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingUserId(null);
      // Refresh users list
      const response = await api.get('/auth/admin/users/');
      setUsers(response.data);
      // Reset form
      setFormData({
        username: '',
        password: '',
        email: '',
        full_name: '',
        pharmacy_license: '',
        role: 'pharmacist'
      });
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      setError('Failed to save user: ' + (serverMsg || err.message));
      console.error('ManageUsers.handleSubmit error:', err.response?.data || err.message);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleEdit = (user) => {
    setIsEditMode(true);
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      pharmacy_license: '',
      role: user.role || 'customer'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.username}?`)) return;
    try {
      await api.delete(`/auth/admin/users/${user.id}/delete/`);
      setSuccessMessage('User deleted successfully');
      const response = await api.get('/auth/admin/users/');
      setUsers(response.data);
    } catch (err) {
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      setError('Failed to delete user: ' + (serverMsg || err.message));
      console.error('ManageUsers.handleDelete error:', err.response?.data || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-blue-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Manage Users</h1>
            </div>
            <button
              onClick={() => { setIsModalOpen(true); setIsEditMode(false); setEditingUserId(null); setFormData(prev => ({ ...prev, role: 'pharmacist' })); }}
              className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add User
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            View and manage all users in the system.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          onClick={() => handleEdit(user)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDelete(user)}
                        >
                          Delete
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Pharmacist Modal */}
      <Transition show={isModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-10 overflow-y-auto"
          onClose={() => setIsModalOpen(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <DialogBackdrop className="fixed inset-0 bg-black opacity-30" />
            
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>

            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <Dialog.Title
                as="h3"
                className="text-lg font-medium leading-6 text-gray-900"
              >
                {isEditMode ? 'Edit User' : `Add New ${formData.role === 'admin' ? 'Admin' : 'Pharmacist'}`}
              </Dialog.Title>

              <form onSubmit={handleSubmit} className="mt-4">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.username}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      id="password"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.password}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      id="full_name"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.full_name}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="pharmacy_license" className="block text-sm font-medium text-gray-700">
                      Pharmacy License (optional)
                    </label>
                    <input
                      type="text"
                      name="pharmacy_license"
                      id="pharmacy_license"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={formData.pharmacy_license}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="pharmacist">Pharmacist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {isEditMode ? 'Save Changes' : `Add ${formData.role === 'admin' ? 'Admin' : 'Pharmacist'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default ManageUsers;