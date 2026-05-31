import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, BranchInfo } from '../context/AuthContext';
import toast from 'react-hot-toast';

const BranchSelector: React.FC = () => {
  const {
    user,
    activeBranch,
    allowedBranches,
    switchBranch,
    requiresBranchSelection,
  } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pendingBranch, setPendingBranch] = useState<BranchInfo | null>(null);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin' || user?.is_admin;
  const branches = allowedBranches.length > 0 ? allowedBranches : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayBranchName =
    activeBranch?.name ||
    user?.branch_info?.name ||
    (user?.home_branch as { name?: string } | undefined)?.name ||
    'Branch';

  // Pharmacist / non-admin: plain label only
  if (!isAdmin) {
    return (
      <span
        className="text-sm font-semibold text-gray-700 dark:text-gray-200 px-3 py-1.5"
        title="Your assigned branch"
      >
        {displayBranchName}
      </span>
    );
  }

  const handleConfirmSwitch = async () => {
    if (!pendingBranch) return;
    setSwitching(true);
    const result = await switchBranch(pendingBranch.id);
    setSwitching(false);
    setPendingBranch(null);
    setOpen(false);
    if (result.success) {
      toast.success(`Switched to ${pendingBranch.name}`);
      window.location.reload();
    } else {
      toast.error('Failed to switch branch.');
    }
  };

  const handlePickBranch = (branch: BranchInfo) => {
    if (activeBranch?.id === branch.id) {
      setOpen(false);
      return;
    }
    setPendingBranch(branch);
    setOpen(false);
  };

  if (requiresBranchSelection && !activeBranch) {
    return (
      <button
        type="button"
        onClick={() => navigate('/branch/select')}
        className="text-sm font-bold text-indigo-600 underline"
      >
        Select branch
      </button>
    );
  }

  return (
    <>
      <div ref={dropdownRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          title="Switch branch"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors"
          style={{
            borderColor: 'var(--border-primary)',
            background: 'var(--glass-bg)',
            color: 'var(--text-primary)',
          }}
        >
          <span className="truncate max-w-[140px]">{displayBranchName}</span>
          <span aria-hidden className="opacity-60">▼</span>
        </button>

        {open && (
          <div
            className="absolute right-0 mt-2 min-w-[220px] rounded-xl border shadow-lg z-[9999] overflow-hidden"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--border-primary)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {branches.map((branch) => {
              const selected = activeBranch?.id === branch.id;
              return (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => handlePickBranch(branch)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    fontWeight: selected ? 700 : 400,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="w-4 text-primary">{selected ? '✓' : ''}</span>
                  <span>{branch.name}</span>
                </button>
              );
            })}
            {branches.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-500">No branches available</p>
            )}
          </div>
        )}
      </div>

      {pendingBranch && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="branch-switch-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
            <h3 id="branch-switch-title" className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Switch to {pendingBranch.name}?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Your active branch will change and all transactions will be recorded under{" "}
              <strong>{pendingBranch.name}</strong>.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                disabled={switching}
                onClick={() => setPendingBranch(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={switching}
                onClick={handleConfirmSwitch}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {switching ? 'Switching…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BranchSelector;
