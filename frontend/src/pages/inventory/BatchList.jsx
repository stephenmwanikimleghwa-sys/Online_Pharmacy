import React, { useState, useEffect } from 'react';
import inventoryService from '../../services/inventoryService';
import { useNotification } from '../../context/NotificationContext';
import { notifyApiError, getApiErrorDisplay } from '../../utils/notifyApiError';

const BatchList = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { notify } = useNotification();

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const response = await inventoryService.getBatches();
            setBatches(Array.isArray(response.data) ? response.data : (response.data?.results || []));
        } catch (err) {
            const display = getApiErrorDisplay(err, 'Could Not Load Batches', 'Batch records could not be loaded. Please try again.');
            setError(display.message);
            notifyApiError(notify, err, display.title, display.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-gray-500">Loading batches...</div>;
    if (error) return (
        <div className="p-4 text-red-600">
            <p>{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>
            <button type="button" onClick={fetchBatches} className="mt-2 px-3 py-1 rounded border border-red-300 text-sm">
                Retry
            </button>
        </div>
    );

    return (
        <div className="glass-card overflow-hidden border" style={{ borderColor: 'var(--border-primary)', borderRadius: 'var(--radius-surface)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <h2 className="text-lg font-display font-bold" style={{ color: 'var(--text-primary)' }}>Batches</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Track batch numbers and expiry</p>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead style={{ background: 'var(--bg-field)' }}>
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Batch #</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Product</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Supplier</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Quantity</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Expiry</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {batches.map((batch) => {
                            const isExpired = new Date(batch.expiry_date) < new Date();
                            const isNearExpiry = !isExpired && new Date(batch.expiry_date) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days

                            return (
                                <tr key={batch.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                        {batch.batch_number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {batch.product_name || `Product #${batch.product}`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {batch.supplier_name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                                        {batch.quantity_remaining ?? batch.quantity}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        {new Date(batch.expiry_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {isExpired ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                Expired
                                            </span>
                                        ) : isNearExpiry ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                Expiring Soon
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Valid
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {batches.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                    No batches found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BatchList;
