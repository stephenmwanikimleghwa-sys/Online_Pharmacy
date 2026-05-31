import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Blocks children until the user has an active branch (JWT session).
 * Admins are sent to branch selection; other staff see a static message.
 */
const ActiveBranchGuard = ({ children, title = 'Branch required' }) => {
  const { user, activeBranch, requiresBranchSelection, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (activeBranch?.id && !requiresBranchSelection) {
    return <>{children}</>;
  }

  const isAdmin = user?.role === 'admin' || user?.is_admin;

  return (
    <div className="rounded-2xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/20 p-8 text-center max-w-lg mx-auto">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
        Select which branch you are working at before recording stock transfers or other branch-scoped operations.
      </p>
      {isAdmin ? (
        <Link
          to="/branch/select"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
        >
          Select branch
        </Link>
      ) : (
        <p className="text-sm text-gray-500">Contact an administrator if your account has no branch assigned.</p>
      )}
    </div>
  );
};

export default ActiveBranchGuard;
