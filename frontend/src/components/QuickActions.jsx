import React from 'react';

const QuickActions = ({ onQuickSale, onAddPrescription, onViewReports, onViewInventory }) => {
  const actions = [
    { label: 'Quick sale', onClick: onQuickSale },
    { label: 'New prescription', onClick: onAddPrescription },
    { label: 'Reports', onClick: onViewReports },
    { label: 'Inventory', onClick: onViewInventory },
  ];

  return (
    <div
      className="glass-card p-5 md:p-6 border"
      style={{ borderRadius: 'var(--radius-surface)', borderColor: 'var(--border-primary)' }}
    >
      <h2
        className="text-lg font-display font-bold tracking-tight mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Quick actions
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className="px-4 py-3.5 rounded-lg text-sm font-semibold text-left transition-colors"
            style={{
              background: 'var(--bg-field)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-primary)',
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
