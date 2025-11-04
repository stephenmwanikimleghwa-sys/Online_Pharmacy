import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/24/outline';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const RestockRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    product: '',
    requested_quantity: '',
    supplier: '',
    notes: '',
    estimated_cost: '',
  });
  const [products, setProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    product: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch restock requests with pagination and filters
  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        ...(filters.status && { status: filters.status }),
        ...(filters.product && { product_id: filters.product }),
      });

      const response = await api.get(`/inventory/restock-requests/?${params}`);
      setRequests(response.data.results);
      setTotalPages(Math.ceil(response.data.count / 10));
    } catch (err) {
      console.error('Failed to fetch restock requests:', err);
      setError('Failed to load restock requests');
    } finally {
      setLoading(false);
    }
  };

  // Fetch products for the select dropdown
  const fetchProducts = async () => {
    try {
      const response = await api.get('/inventory/');
      setProducts(response.data.products || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentPage, filters]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const validateForm = () => {
    const errors = {};
    if (!formData.product) errors.product = 'Product is required';
    if (!formData.requested_quantity || formData.requested_quantity <= 0) {
      errors.requested_quantity = 'Quantity must be greater than zero';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await api.post('/inventory/restock-requests/', {
        ...formData,
        requested_quantity: parseInt(formData.requested_quantity, 10),
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      });
      setIsModalOpen(false);
      setFormData({
        product: '',
        requested_quantity: '',
        supplier: '',
        notes: '',
        estimated_cost: '',
      });
      fetchRequests();
    } catch (err) {
      console.error('Failed to create restock request:', err);
      setError('Failed to create restock request');
      if (err.response?.data) {
        setFormErrors(err.response.data);
      }
    }
  };

  const handleStatusUpdate = async (requestId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this request?`)) return;

    try {
      await api.post(`/inventory/restock-requests/${requestId}/${action}/`);
      fetchRequests();
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      setError(`Failed to ${action} request`);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Restock Requests</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" /> New Request
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700">{error}</div>}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6 p-4">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select
                value={filters.product}
                onChange={(e) => setFilters({ ...filters, product: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.product_details?.name}
                      </div>
                      <div className="text-sm text-gray-500">{request.supplier}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.requested_by_username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.requested_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          STATUS_COLORS[request.status]
                        }`}
                      >
                        {request.status_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'approve')}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(request.id, 'reject')}
                            className="text-red-600 hover:text-red-900 mr-3"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {request.status === 'approved' && (
                        <button
                          onClick={() => handleStatusUpdate(request.id, 'complete')}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Complete
                        </button>
                      )}
                      {['pending', 'approved'].includes(request.status) && (
                        <button
                          onClick={() => handleStatusUpdate(request.id, 'cancel')}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between border-t">
            <div className="flex-1 flex justify-between">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Transition show={isModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-10 overflow-y-auto"
          onClose={() => setIsModalOpen(false)}
        >
          <div className="min-h-screen px-4 text-center">
            <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
            <span className="inline-block h-screen align-middle" aria-hidden>
              &#8203;
            </span>
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                New Restock Request
              </Dialog.Title>

              <form onSubmit={handleSubmit} className="mt-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product</label>
                    <select
                      value={formData.product}
                      onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        formErrors.product ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.product && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.product}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Requested Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.requested_quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, requested_quantity: e.target.value })
                      }
                      className={`mt-1 block w-full rounded-md shadow-sm ${
                        formErrors.requested_quantity ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.requested_quantity && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.requested_quantity}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier</label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Estimated Cost
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.estimated_cost}
                      onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    Create Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default RestockRequests;