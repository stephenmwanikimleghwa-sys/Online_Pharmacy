import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const { isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16">
      <p className="text-6xl font-bold text-primary mb-2">404</p>
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Page not found
      </h1>
      <p className="text-sm mb-8 max-w-md" style={{ color: 'var(--text-secondary)' }}>
        This route does not exist or may have moved. Use the menu to continue working.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        {isAuthenticated ? (
          <button
            type="button"
            className="btn-primary px-5 py-2.5 rounded-xl font-semibold"
            onClick={() => navigate(getDashboardPath())}
          >
            Go to dashboard
          </button>
        ) : (
          <Link to="/login" className="btn-primary px-5 py-2.5 rounded-xl font-semibold">
            Log in
          </Link>
        )}
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl border font-semibold"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
