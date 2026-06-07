import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccessDenied from './AccessDenied';

interface ProtectedRouteProps {
  element?: React.ElementType;
  children?: React.ReactNode;
  allowedRoles?: string[];
  allowFinancials?: boolean;
  /** Redirect to branch selection if no active branch (staff operations). */
  requiresActiveBranch?: boolean;
  deniedTitle?: string;
  deniedMessage?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element: Element,
  children,
  allowedRoles = [],
  allowFinancials = false,
  requiresActiveBranch = false,
  deniedTitle,
  deniedMessage,
}) => {
  const { user, token, loading, activeBranch, requiresBranchSelection, allowedBranches } = useAuth();
  const location = useLocation();
  const onBranchSelectPage = location.pathname === "/branch/select";

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" aria-hidden />
        <p className="text-sm font-medium text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" aria-hidden />
        <p className="text-sm font-medium text-neutral-500">Loading your session...</p>
      </div>
    );
  }

  const renderProtected = () => {
    if (Element) {
      return <Element />;
    }
    return <>{children}</>;
  };

  const userRole = user.role?.toString?.().toLowerCase?.() || '';
  const allowedRolesLower = allowedRoles.map((role) => role?.toString?.().toLowerCase?.());

  if (allowedRoles.length > 0) {
    if (allowFinancials && user.can_view_financials) {
      // allowed via financials flag
    } else if (!userRole || !allowedRolesLower.includes(userRole)) {
      return (
        <AccessDenied
          title={deniedTitle || "Page not available"}
          message={deniedMessage || "Your role does not include access to this page. Use the menu to open features assigned to you."}
        />
      );
    }
  }

  const isAdmin = userRole === "admin" || Boolean(user.is_admin);
  const isPharmacist = userRole === "pharmacist" || Boolean(user.is_pharmacist);

  if (isAdmin && requiresBranchSelection && !onBranchSelectPage) {
    return <Navigate to="/branch/select" replace />;
  }

  const adminNeedsBranchPick =
    isAdmin && !activeBranch?.id && allowedBranches.length > 1;
  if (adminNeedsBranchPick && !onBranchSelectPage) {
    return <Navigate to="/branch/select" replace />;
  }

  if (requiresActiveBranch && !activeBranch?.id) {
    if (isAdmin) {
      return <Navigate to="/branch/select" replace />;
    }
    if (isPharmacist) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-6 text-center">
          <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            No branch assigned
          </p>
          <p className="text-sm text-neutral-500 max-w-md">
            Your pharmacist account is not linked to an active branch. Ask an administrator to
            assign you to a branch, then log in again.
          </p>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  return renderProtected();
};

export default ProtectedRoute;
