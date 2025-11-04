import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { UserIcon, ShoppingBagIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPharmacies: 0,
    totalOrders: 0,
    pendingOrders: 0
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Role protection: redirect if not admin
    if (!user || user.role !== 'admin') {
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch users (admin users endpoint exists)
        const usersRes = await api.get('/auth/admin/users/').catch((err) => {
          console.warn('Failed to load users for dashboard', err);
          return { data: [] };
        });


        const ordersRes = await api.get('/orders/').catch((err) => {
          console.warn('Failed to load orders for dashboard, treating as empty', err);
          return { data: [] };
        });

        // Normalize responses: some APIs return paginated objects {results: [...]} or objects instead of arrays.
        const usersData = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.results ?? []);
  // We don't use pharmacies in this deployment. Treat as empty.
  const pharmaciesData = [];
        const ordersData = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.results ?? []);

        setUsers(usersData);
        setStats({
          totalUsers: usersData.length,
          totalPharmacies: pharmaciesData.length,
          totalOrders: ordersData.length,
          pendingOrders: ordersData.filter(order => order.status === 'pending').length
        });
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token, navigate, location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">
            Welcome back, {user.full_name || user.username}. Manage users, stock, and orders.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShoppingBagIcon className="h-6 w-6 text-indigo-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalOrders}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Orders</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pendingOrders}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Recent Users</h2>
          </div>
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.slice(0, 10).map((userItem) => (
                    <tr key={userItem.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {userItem.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userItem.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userItem.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userItem.is_verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {userItem.is_verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/admin/users')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-sm font-medium transition-colors"
          >
            Manage Users
          </button>
          <button
            onClick={() => navigate('/admin/stock')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md shadow-sm font-medium transition-colors"
          >
            Manage Stock
          </button>
          <button
            onClick={() => navigate('/admin/orders')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-sm font-medium transition-colors"
          >
            Manage Orders
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
