import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from '../components/LoadingSpinner';

const Login = () => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
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
      username: credentials.username,
      password: '[REDACTED]'
    });
    
    const result = await login(credentials);
    console.log('[Login Debug] Login result:', {
      success: result.success,
      user: result.user,
      error: result.error
    });
    
  if (result.success) {
      const returnedUser = result.user;
      console.log('[Login Debug] Processing successful login:', {
        returnedUser
      });

      // Get the normalized role from various possible fields
      const determineRole = (user) => {
        if (!user) return null;
        
        // Check explicit role fields
        if (user.role) return user.role.toString().toLowerCase();
        if (user.user_type) return user.user_type.toString().toLowerCase();
        
        // Check boolean flags
        if (user.is_pharmacist) return 'pharmacist';
        if (user.is_admin) return 'admin';
        if (user.is_customer) return 'customer';
        
        return null;
      };

      const role = determineRole(returnedUser);
      console.log('[Login Debug] Determined user role:', {
        role,
        userFields: {
          role: returnedUser?.role,
          user_type: returnedUser?.user_type,
          is_pharmacist: returnedUser?.is_pharmacist,
          is_admin: returnedUser?.is_admin
        }
      });

      // Determine redirect path
      let target = "/";
      if (role === "pharmacist") {
        target = "/pharmacist/dashboard";
      } else if (role === "admin") {
        target = "/admin/dashboard";
      } else if (role === "customer") {
        target = "/customer/dashboard";
      } else {
        // If no role determined from user object, fall back to context
        console.log('[Login Debug] No role found in user object, using context fallback');
        try {
          target = getDashboardPath();
        } catch (err) {
          console.warn("[Login Debug] Context fallback failed:", err);
          // Final fallback: default to home
          target = "/";
        }
      }

      console.log('[Login Debug] Redirecting to:', {
        target,
        role,
        fallbackUsed: !role
      });

      navigate(target);
    } else {
      // result.error may be an object like:
      // { non_field_errors: [...]} or { username: [...], password: [...] }
      const err = result.error;

      const formatError = (errObj) => {
        if (!errObj) return "Login failed. Please check your credentials.";
        if (typeof errObj === "string") return errObj;
        if (errObj.non_field_errors && errObj.non_field_errors.length)
          return errObj.non_field_errors[0];
        if (errObj.detail) return errObj.detail;

        // Field-level errors
        const fieldMessages = [];
        ["username", "password", "email"].forEach((f) => {
          if (errObj[f]) {
            const msgs = Array.isArray(errObj[f]) ? errObj[f].join(" ") : String(errObj[f]);
            fieldMessages.push(`${f.charAt(0).toUpperCase() + f.slice(1)}: ${msgs}`);
          }
        });

        if (fieldMessages.length) return fieldMessages.join(" ");

        // Fallback to serializing available keys
        try {
          return Object.values(errObj)
            .flat()
            .filter(Boolean)
            .join(" ") || "Login failed. Please check your credentials.";
        } catch (e) {
          return "Login failed. Please check your credentials.";
        }
      };

      setError(formatError(err));
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
          {/* Registration disabled - only login allowed */}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
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
                Password
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
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {/* Toggle icons: show an open eye when password is visible, and a slashed eye when hidden */}
                  {showPassword ? (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            {/* Role selection removed — users are redirected based on their server-side role */}
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
