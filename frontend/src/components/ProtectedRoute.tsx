import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  element?: React.ElementType;
  children?: React.ReactNode;
  allowedRoles?: string[];
  allowFinancials?: boolean;
  /** Redirect to branch selection if no active branch (staff operations). */
  requiresActiveBranch?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element: Element,
  children,
  allowedRoles = [],
  allowFinancials = false,
  requiresActiveBranch = false,
}) => {
  const { user, loading, activeBranch, requiresBranchSelection } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" aria-hidden />
        <p className="text-sm font-medium text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
      return <Navigate to="/" replace />;
    }
  }

  if (requiresBranchSelection) {
    return <Navigate to="/branch/select" replace />;
  }

  if (requiresActiveBranch && !activeBranch?.id) {
    const isAdmin = userRole === 'admin';
    return <Navigate to={isAdmin ? '/branch/select' : '/login'} replace />;
  }

  return renderProtected();
};

export default ProtectedRoute;
