import { useAuth } from '../context/AuthContext';

/** Active branch from auth context (JWT session). */
export function useActiveBranch() {
  const { activeBranch, allowedBranches, requiresBranchSelection } = useAuth();
  return { activeBranch, allowedBranches, requiresBranchSelection };
}
