import React from 'react';

const ExpiryWarningModal = ({ warning, onAddAnyway, onRemove }) => {
  if (!warning || warning.level === 'OK' || warning.level === 'CAUTION') return null;

  if (warning.level !== 'CRITICAL') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-xl bg-white dark:bg-gray-900">
        <h3 className="text-lg font-bold text-amber-700 mb-3">⚠️ Expiry Warning</h3>
        <p className="font-semibold">{warning.product_name}</p>
        <p className="text-sm mt-2 text-gray-600">
          Earliest batch expires in <strong>{warning.days_to_expiry}</strong> days ({warning.expiry_date}).
        </p>
        <p className="text-sm text-gray-600">
          Quantity in this batch: <strong>{warning.quantity_in_batch}</strong> units
        </p>
        <p className="text-sm mt-3 text-gray-700">
          This product may expire before the customer can finish it.
        </p>
        <div className="flex gap-2 justify-end mt-6">
          <button type="button" className="btn-secondary px-4 py-2 rounded-lg" onClick={onRemove}>
            Remove from Sale
          </button>
          <button type="button" className="btn-primary px-4 py-2 rounded-lg" onClick={onAddAnyway}>
            Add Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpiryWarningModal;
