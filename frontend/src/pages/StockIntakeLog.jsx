import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline';

const StockIntakeLog = () => {
  const { user } = useAuth();
  const [intakeRecords, setIntakeRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterDistributor, setFilterDistributor] = useState('');
  const [summary, setSummary] = useState(null);

  const [formData, setFormData] = useState({
    product: '',
    distributor_name: '',
    quantity_received: '',
    unit_cost: '',
    expiry_date: '',
    batch_number: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState({});

  const [suppliers, setSuppliers] = useState([]);

  // Fetch stock intake records
  useEffect(() => {
    fetchIntakeRecords();
    fetchProducts();
    fetchSuppliers();
    fetchSummary();
  }, [filterDistributor]);

  const fetchIntakeRecords = async () => {
    try {
      setLoading(true);
      const params = filterDistributor ? `?distributor=${filterDistributor}` : '';
      const response = await api.get(`/inventory/stock-intake/${params}`);
      setIntakeRecords(Array.isArray(response.data) ? response.data : response.data.results || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching intake records:', err);
      setError('Failed to fetch stock intake records');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products/');
      setProducts(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/inventory/suppliers/');
      setSuppliers(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/inventory/stock-intake/summary/');
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.product) errors.product = 'Product is required';
    if (!formData.distributor_name) errors.distributor_name = 'Distributor name is required';
    if (!formData.quantity_received || formData.quantity_received <= 0) {
      errors.quantity_received = 'Quantity must be greater than 0';
    }
    if (!formData.unit_cost || formData.unit_cost <= 0) {
      errors.unit_cost = 'Unit cost must be greater than 0';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await api.post('/inventory/stock-intake/', {
        product: formData.product,
        distributor_name: formData.distributor_name,
        quantity_received: parseInt(formData.quantity_received),
        unit_cost: parseFloat(formData.unit_cost),
        expiry_date: formData.expiry_date || null,
        batch_number: formData.batch_number,
        notes: formData.notes,
      });

      // Reset form and refresh records
      setFormData({
        product: '',
        distributor_name: '',
        quantity_received: '',
        unit_cost: '',
        expiry_date: '',
        batch_number: '',
        notes: '',
      });
      setFormErrors({});
      setIsModalOpen(false);
      fetchIntakeRecords();
      fetchSummary();
    } catch (err) {
      console.error('Error creating intake record:', err);
      setError(err.response?.data?.detail || 'Failed to create record');
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  if (!user || (user.role !== 'admin' && user.role !== 'pharmacist')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Only admins and pharmacists can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Stock Intake Log</h1>
          <p className="mt-2 text-gray-600">Record incoming stock from distributors</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total Records</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{summary.total_records}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total Quantity</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{summary.total_quantity_received}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Total Cost</p>
              <p className="text-2xl font-bold text-purple-600 mt-2">KSh {parseFloat(summary.total_cost).toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium">Distributors</p>
              <p className="text-2xl font-bold text-orange-600 mt-2">{summary.distributors}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Record New Stock
          </button>
          <input
            type="text"
            placeholder="Filter by distributor..."
            value={filterDistributor}
            onChange={(e) => setFilterDistributor(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Stock Intake Records Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Distributor</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Unit Cost</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Total Cost</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Expiry Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Received Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : intakeRecords.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      No stock intake records found
                    </td>
                  </tr>
                ) : (
                  intakeRecords.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{record.product_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{record.distributor_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{record.quantity_received}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">KSh {parseFloat(record.unit_cost).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">KSh {parseFloat(record.total_cost).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {record.expiry_date ? new Date(record.expiry_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(record.received_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Stock Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-900">Record New Stock</h2>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                {/* Product */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <select
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.product ? 'border-red-500' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select a product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.product && <p className="text-red-600 text-sm mt-1">{formErrors.product}</p>}
                </div>

                {/* Distributor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distributor Name</label>
                  <input
                    type="text"
                    list="distributors-list"
                    value={formData.distributor_name}
                    onChange={(e) => setFormData({ ...formData, distributor_name: e.target.value })}
                    placeholder="e.g., ABC Pharma Distributor"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.distributor_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  <datalist id="distributors-list">
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.name} />
                    ))}
                  </datalist>
                  {formErrors.distributor_name && <p className="text-red-600 text-sm mt-1">{formErrors.distributor_name}</p>}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Received</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity_received}
                    onChange={(e) => setFormData({ ...formData, quantity_received: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.quantity_received ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {formErrors.quantity_received && <p className="text-red-600 text-sm mt-1">{formErrors.quantity_received}</p>}
                </div>

                {/* Unit Cost */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (KSh)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.unit_cost ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {formErrors.unit_cost && <p className="text-red-600 text-sm mt-1">{formErrors.unit_cost}</p>}
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Batch Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.batch_number}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    placeholder="e.g., LOT123456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-medium"
                  >
                    Record Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Record Detail Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Stock Record Details</h2>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Product</p>
                  <p className="text-lg font-medium text-gray-900">{selectedRecord.product_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Distributor</p>
                  <p className="text-lg font-medium text-gray-900">{selectedRecord.distributor_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Quantity</p>
                    <p className="text-lg font-medium text-gray-900">{selectedRecord.quantity_received}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unit Cost</p>
                    <p className="text-lg font-medium text-gray-900">KSh {parseFloat(selectedRecord.unit_cost).toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Cost</p>
                  <p className="text-lg font-medium text-blue-600">KSh {parseFloat(selectedRecord.total_cost).toLocaleString()}</p>
                </div>
                {selectedRecord.expiry_date && (
                  <div>
                    <p className="text-sm text-gray-600">Expiry Date</p>
                    <p className="text-lg font-medium text-gray-900">{new Date(selectedRecord.expiry_date).toLocaleDateString()}</p>
                  </div>
                )}
                {selectedRecord.batch_number && (
                  <div>
                    <p className="text-sm text-gray-600">Batch Number</p>
                    <p className="text-lg font-medium text-gray-900">{selectedRecord.batch_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Received Date</p>
                  <p className="text-lg font-medium text-gray-900">{new Date(selectedRecord.received_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Received By</p>
                  <p className="text-lg font-medium text-gray-900">{selectedRecord.received_by_username}</p>
                </div>
                {selectedRecord.notes && (
                  <div>
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-gray-900">{selectedRecord.notes}</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockIntakeLog;
