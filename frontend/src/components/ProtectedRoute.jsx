import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assuming AuthContext provides auth state

const ProtectedRoute = ({ element: Element, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  console.log('[ProtectedRoute Debug]', {
    path: window.location.pathname,
    user,
    allowedRoles
  });

  // Check for authenticated user first
  if (!user) {
    console.warn('Protected route accessed without user, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If no roles specified, just check for authentication
  if (!allowedRoles || allowedRoles.length === 0) {
    return <Element />;
  }

  // Safely check role against allowed roles
  const userRole = user.role?.toString?.().toLowerCase?.() || '';
  const allowedRolesLower = allowedRoles.map(role => role?.toString?.().toLowerCase?.());

  console.log('[ProtectedRoute Debug] Role check:', {
    userRole,
    allowedRoles: allowedRolesLower,
    matches: allowedRolesLower.includes(userRole)
  });

  if (!userRole || !allowedRolesLower.includes(userRole)) {
    console.warn(
      `Access denied: User role "${user.role || 'none'}" not in allowed roles: [${allowedRoles.join(', ')}]`,
      { user }
    );
    return <Navigate to="/" replace />;
  }

  return <Element />;
};

export default ProtectedRoute;
