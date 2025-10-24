import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assuming AuthContext provides auth state

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check for authenticated user first
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Safely check role if required
  if (requiredRole && (!user.role || user.role !== requiredRole)) {
    console.warn(`Access denied: Required role "${requiredRole}" not met. User role: "${user.role || 'none'}"`);
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
