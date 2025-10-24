import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from '../components/LoadingSpinner';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
    role: "customer" // default role
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If already authenticated, redirect to appropriate dashboard
    if (isAuthenticated) {
      navigate(getDashboardPath());
    }
  }, [isAuthenticated, navigate, getDashboardPath]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log('[Login Debug] Attempting login with credentials:', {
      ...credentials,
      password: '[REDACTED]'
    });
    
    const result = await login(credentials);
    console.log('[Login Debug] Login result:', {
      success: result.success,
      user: result.user,
      error: result.error
    });
    
    if (result.success) {
      // Prefer using the user object returned from the login call since
      // context state updates (setUser) may not be immediately visible.
      const returnedUser = result.user;

      // Normalize the role to lowercase for reliable comparisons. If role
      // is missing, we'll fall back to context's getDashboardPath.
      const role = returnedUser?.role?.toString?.().toLowerCase?.() || null;
      console.log('[Login Debug] Computed role for redirect:', {
        returnedUser,
        normalizedRole: role
      });

      // Compute target path based on role (avoid depending on context timing)
      let target = "/";
      if (role === "pharmacist") target = "/pharmacist-dashboard";
      else if (role === "admin") target = "/admin";
      else if (role === "customer") target = "/"; // or '/customer/dashboard' if available

      // Fallback to context helper if needed
      if (!returnedUser || !role) {
        try {
          target = getDashboardPath();
        } catch (err) {
          console.warn("Fallback to default path due to missing user in context", err);
        }
      }

      navigate(target);
    } else {
      setError(
        result.error?.non_field_errors?.[0] ||
          result.error?.detail ||
          "Login failed. Please check your credentials.",
      );
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <a
              href="/register"
              className="font-medium text-primary hover:text-primary-dark transition-colors duration-150 underline decoration-2 decoration-primary/30 hover:decoration-primary"
            >
              create a new account
            </a>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username *
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={credentials.username}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="Enter username"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={credentials.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full pr-10 pl-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Login as
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCredentials(prev => ({ ...prev, role: 'customer' }))}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    credentials.role === 'customer'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCredentials(prev => ({ ...prev, role: 'pharmacist' }))}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    credentials.role === 'pharmacist'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pharmacist
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-4 rounded-md border border-red-200">
              <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
              <p className="flex-1">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark transform transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" color="white" />
                  <span>Signing in...</span>
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
