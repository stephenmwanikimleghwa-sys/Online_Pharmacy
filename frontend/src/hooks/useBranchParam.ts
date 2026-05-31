/**
 * useBranchParam — passes the active branch to backend API calls.
 */
import { useAuth } from '../context/AuthContext';

interface BranchParamResult {
  branchQuery: string;
  branchParams: Record<string, string | number>;
  branchId: number | null;
  isAllBranches: boolean;
  hasActiveBranch: boolean;
}

export function useBranchParam(): BranchParamResult {
  const { user, activeBranch } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.is_admin;

  if (!isAdmin) {
    return {
      branchQuery: '',
      branchParams: {},
      branchId: activeBranch?.id ?? null,
      isAllBranches: false,
      hasActiveBranch: Boolean(activeBranch?.id),
    };
  }

  if (!activeBranch?.id) {
    return {
      branchQuery: '',
      branchParams: {},
      branchId: null,
      isAllBranches: false,
      hasActiveBranch: false,
    };
  }

  return {
    branchQuery: `?branch=${activeBranch.id}`,
    branchParams: { branch: activeBranch.id },
    branchId: activeBranch.id,
    isAllBranches: false,
    hasActiveBranch: true,
  };
}
