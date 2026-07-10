import React from 'react';
import { useAuth } from '../context/AuthContext';
import { getBranchIcon, getBranchSubtitle } from '../utils/branchDisplay';

/**
 * A slim inline banner that clearly communicates to staff which
 * product category is visible at their current branch.
 *
 * - CHEMIST branches → blue pill icon + "Pharmaceutical products only"
 * - AGROVET branches → green leaf icon + "Agricultural & veterinary products only"
 * - No active branch → nothing rendered (fail safe = show all)
 *
 * Props:
 *   context  – optional string shown after the tagline e.g. "in search results"
 *   compact  – renders a smaller single-line version
 */
const BranchTypeBanner = ({ context = '', compact = false }) => {
  const { activeBranch } = useAuth();

  if (!activeBranch) return null;

  const branchType = activeBranch.type?.toUpperCase();
  const isAgrovet = branchType === 'AGROVET';

  const icon = getBranchIcon(activeBranch);
  const subtitle = getBranchSubtitle(activeBranch);

  const taglines = {
    CHEMIST: 'Pharmaceutical products only',
    AGROVET: 'Agricultural & veterinary products only',
  };

  const tagline = taglines[branchType] ?? 'All products visible';

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
          isAgrovet
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}
      >
        <span>{icon}</span>
        <span>{tagline}{context ? ` ${context}` : ''}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border text-sm font-medium mb-5 ${
        isAgrovet
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-indigo-50 border-indigo-200 text-indigo-900'
      }`}
    >
      <span className="text-xl shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="font-bold">
          {activeBranch.name} — {subtitle}
        </p>
        <p className="text-xs mt-0.5 opacity-80 font-normal">
          {tagline}
          {context ? ` ${context}` : ''}. Universal products are always visible.
        </p>
      </div>
    </div>
  );
};

export default BranchTypeBanner;
