/**
 * useBranchParam — returns a ready-to-use query string and param object
 * that passes the active branch to backend API calls.
 *
 * Usage:
 *   const { branchQuery } = useBranchParam();
 *   api.get(`/inventory/stats/${branchQuery}`)   // → "?branch=3" or "?branch=all" or ""
 *
 *   const { branchParams } = useBranchParam();
 *   api.get('/inventory/stock-intake/', { params: branchParams })
 */
import { useAuth } from '../context/AuthContext';

interface BranchParamResult {
  /** URL query string, e.g. "?branch=3" or "" for non-admins (backend handles scoping) */
  branchQuery: string;
  /** Axios params object, e.g. { branch: 3 } or {} */
  branchParams: Record<string, string | number>;
  /** The active branch id, or 'all', or null */
  branchId: number | 'all' | null;
  /** True when admin has selected "All Branches" */
  isAllBranches: boolean;
}

export function useBranchParam(): BranchParamResult {
  const { user, activeBranch } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.is_admin;

  if (!isAdmin) {
    // Non-admin: backend scopes automatically via user.branch — no param needed
    return { branchQuery: '', branchParams: {}, branchId: null, isAllBranches: false };
  }

  if (activeBranch === null) {
    // Admin — "All Branches" view
    return {
      branchQuery: '?branch=all',
      branchParams: { branch: 'all' },
      branchId: 'all',
      isAllBranches: true,
    };
  }

  return {
    branchQuery: `?branch=${activeBranch.id}`,
    branchParams: { branch: activeBranch.id },
    branchId: activeBranch.id,
    isAllBranches: false,
  };
}
