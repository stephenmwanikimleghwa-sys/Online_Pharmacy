import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import api from '../services/api';

const ExportModal = ({
  isOpen,
  onClose,
  title,
  endpoint,
  filters = [],
  dateRange = false,
}) => {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateFilters, setDateFilters] = useState({
    start_date: '',
    end_date: '',
  });

  const handleExport = async () => {
    try {
      setLoading(true);
      setError('');

      // Build query params
      const params = new URLSearchParams();
      filters.forEach(filter => {
        if (formData[filter.name]) {
          params.append(filter.name, formData[filter.name]);
        }
      });

      // Add date range if enabled and set
      if (dateRange) {
        if (dateFilters.start_date) {
          params.append('start_date', dateFilters.start_date);
        }
        if (dateFilters.end_date) {
          params.append('end_date', dateFilters.end_date);
        }
      }

      // Fetch file as blob
      const response = await api.get(`${endpoint}?${params.toString()}`, {
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'export.csv';
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      onClose();
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        onClose={() => !loading && onClose()}
      >
        <div className="min-h-screen px-4 text-center">
          <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />
          <span className="inline-block h-screen align-middle" aria-hidden>
            &#8203;
          </span>
          <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
              {title}
            </Dialog.Title>

            <div className="mt-4">
              {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
              )}

              <div className="space-y-4">
                {filters.map(filter => (
                  <div key={filter.name}>
                    <label className="block text-sm font-medium text-gray-700">
                      {filter.label}
                    </label>
                    {filter.type === 'select' ? (
                      <select
                        value={formData[filter.name] || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, [filter.name]: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        disabled={loading}
                      >
                        <option value="">{filter.placeholder || 'All'}</option>
                        {filter.options.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={filter.type || 'text'}
                        value={formData[filter.name] || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, [filter.name]: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder={filter.placeholder}
                        disabled={loading}
                      />
                    )}
                  </div>
                ))}

                {dateRange && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={dateFilters.start_date}
                        onChange={(e) =>
                          setDateFilters({ ...dateFilters, start_date: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={dateFilters.end_date}
                        onChange={(e) =>
                          setDateFilters({ ...dateFilters, end_date: e.target.value })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ExportModal;