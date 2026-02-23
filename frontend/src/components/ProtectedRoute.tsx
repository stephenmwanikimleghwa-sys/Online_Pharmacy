import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assuming AuthContext provides auth state

interface ProtectedRouteProps {
  element: React.ElementType;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element: Element, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" aria-hidden />
        <p className="text-sm font-medium text-neutral-500">Loading...</p>
      </div>
    );
  }

  // Check for authenticated user first
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If no roles specified, just check for authentication
  if (!allowedRoles || allowedRoles.length === 0) {
    return <Element />;
  }

  // Safely check role against allowed roles
  const userRole = user.role?.toString?.().toLowerCase?.() || '';
  const allowedRolesLower = allowedRoles.map(role => role?.toString?.().toLowerCase?.());

  if (!userRole || !allowedRolesLower.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <Element />;
};

export default ProtectedRoute;
