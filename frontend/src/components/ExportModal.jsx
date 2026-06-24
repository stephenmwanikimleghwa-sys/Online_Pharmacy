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
          <Dialog.Overlay className="fixed inset-0 modal-overlay" />
          <span className="inline-block h-screen align-middle" aria-hidden>
            &#8203;
          </span>
          <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform modal-card">
            <Dialog.Title as="h3" className="text-lg font-display font-bold leading-6 mb-4" style={{color:'var(--text-primary)'}}>
              {title}
            </Dialog.Title>

            <div className="mt-4">
              {error && (
                <div className="mb-4 alert-error rounded-xl">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</div>
              )}

              <div className="space-y-4">
                {filters.map(filter => (
                  <div key={filter.name}>
                    <label className="form-label">
                      {filter.label}
                    </label>
                    {filter.type === 'select' ? (
                      <select
                        value={formData[filter.name] || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, [filter.name]: e.target.value })
                        }
                        className="form-input mt-1"
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
                        className="form-input mt-1"
                        placeholder={filter.placeholder}
                        disabled={loading}
                      />
                    )}
                  </div>
                ))}

                {dateRange && (
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        value={dateFilters.start_date}
                        onChange={(e) =>
                          setDateFilters({ ...dateFilters, start_date: e.target.value })
                        }
                        className="form-input mt-1"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label className="form-label">End Date</label>
                      <input
                        type="date"
                        value={dateFilters.end_date}
                        onChange={(e) =>
                          setDateFilters({ ...dateFilters, end_date: e.target.value })
                        }
                        className="form-input mt-1"
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
                className="form-cancel-btn px-4 py-2 rounded-xl"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="btn-primary px-6 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
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