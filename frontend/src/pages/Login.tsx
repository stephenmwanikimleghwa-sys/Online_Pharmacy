import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, LoginCredentials, User } from '../context/AuthContext';
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from '../components/LoadingSpinner';
import '../styles/login-animations.css';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login, isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDashboardPath());
    }
  }, [isAuthenticated, navigate, getDashboardPath]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await login(credentials);

    if (result.success) {
      const returnedUser = result.user;

      const determineRole = (user: User | null | undefined): string | null => {
        if (!user) return null;
        if (user.role) return user.role.toString().toLowerCase();
        if (user.user_type) return user.user_type.toString().toLowerCase();
        if (user.is_pharmacist) return 'pharmacist';
        if (user.is_admin) return 'admin';
        if (user.is_customer) return 'customer';
        return null;
      };

      const role = determineRole(returnedUser);
      let target = "/";

      if (returnedUser?.must_change_password) {
        target = "/force-password-change";
      } else if (role === 'admin') {
        target = '/admin/dashboard';
      } else if (role === 'pharmacist') {
        target = '/pharmacist/dashboard';
      } else if (role === 'cashier') {
        target = '/cashier/dashboard';
      } else if (role === 'auditor') {
        target = '/reports';
      } else if (role === 'customer') {
        target = '/customer/dashboard';
      } else {
        const from = (location.state as any)?.from?.pathname;
        target = from && from !== '/login' ? from : "/";
      }

      navigate(target);
    } else {
      const err = result.error;

      const formatError = (errObj: any): string => {
        if (!errObj) return "Login failed. Please check your credentials.";
        if (typeof errObj === "string") return errObj;
        if (errObj.non_field_errors?.length) return errObj.non_field_errors[0];
        if (errObj.detail) return errObj.detail;

        const fieldMessages: string[] = [];
        ["username", "password", "email"].forEach((f) => {
          if (errObj[f]) {
            const msgs = Array.isArray(errObj[f]) ? errObj[f].join(" ") : String(errObj[f]);
            fieldMessages.push(`${f.charAt(0).toUpperCase() + f.slice(1)}: ${msgs}`);
          }
        });
        if (fieldMessages.length) return fieldMessages.join(" ");

        try {
          return Object.values(errObj).flat().filter(Boolean).join(" ") || "Login failed. Please check your credentials.";
        } catch {
          return "Login failed. Please check your credentials.";
        }
      };

      setError(formatError(err));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen h-screen w-screen flex animate-slide-in-page overflow-hidden">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #c026d3 100%)" }}>
        {/* Decorative blobs - animated */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 bg-white/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 bg-white/10 rounded-full blur-3xl animate-blob-delayed-1" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-blob-delayed-2" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full animate-fade-in">
          {/* Logo */}
          <div className="flex items-center gap-3 transform transition-transform hover:scale-105 duration-300">
            <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 group hover:bg-white/30 transition-colors">
              <span className="text-white font-bold text-lg font-display">TP</span>
            </div>
            <span className="text-white font-display font-bold text-xl tracking-tight">Transcounty</span>
          </div>

          {/* Hero copy */}
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <h1 className="text-5xl font-display font-bold text-white leading-tight mb-4">
              Pharmacy<br />
              <span className="text-white/70">Management</span><br />
              Platform
            </h1>
            <p className="text-white/60 text-lg leading-relaxed max-w-sm">
              A unified system for managing prescriptions, inventory, and dispensing across all pharmacies.
            </p>

            {/* Feature pills - staggered animation */}
            <div className="flex flex-wrap gap-2 mt-8">
              {["Stock", "Prescriptions", "Reports", "Logs"].map((f, i) => (
                <span 
                  key={f} 
                  className="px-3 py-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full text-white/80 text-xs font-medium animate-slide-up hover:bg-white/25 transition-colors cursor-default"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-white/30 text-xs">© 2025 Transcounty Pharmacy Aggregator</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #ecfdf5 100%)" }}>
        {/* Animated background elements */}
        <div className="absolute top-10 right-10 w-40 h-40 bg-indigo-100/30 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-52 h-52 bg-purple-100/20 rounded-full blur-3xl animate-float-delayed" />
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 animate-fade-in">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4f46e5, #c026d3)" }}>
              <span className="text-white font-bold text-base font-display">TP</span>
            </div>
            <span className="font-display font-bold text-xl text-slate-800">Transcounty</span>
          </div>

          {/* Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-premium border border-white/70 p-8 animate-slide-up hover:shadow-2xl transition-shadow duration-500" style={{ animationDelay: '0.1s' }}>
            <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-3xl font-display font-bold text-slate-900 mb-1">Welcome back</h2>
              <p className="text-slate-500 text-sm">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label htmlFor="username" className={`block text-sm font-semibold mb-1.5 transition-colors duration-300 ${
                  focusedField === 'username' ? 'text-indigo-600' : 'text-slate-700'
                }`}>
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={credentials.username}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your username"
                  className={`w-full px-4 py-3 rounded-xl border text-slate-900 placeholder-slate-400 text-sm focus:outline-none transition-all duration-300 ${
                    focusedField === 'username'
                      ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20 scale-[1.01]'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={`block text-sm font-semibold mb-1.5 transition-colors duration-300 ${
                  focusedField === 'password' ? 'text-indigo-600' : 'text-slate-700'
                }`}>
                  Password
                </label>
                <div className="relative group">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={credentials.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-3 pr-11 rounded-xl border text-slate-900 placeholder-slate-400 text-sm focus:outline-none transition-all duration-300 ${
                      focusedField === 'password'
                        ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/20 scale-[1.01]'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-all duration-200 group-hover:text-slate-500"
                  >
                    {showPassword ? <EyeIcon className="h-5 w-5 animate-pulse-subtle" /> : <EyeSlashIcon className="h-5 w-5 animate-pulse-subtle" />}
                  </button>
                </div>
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => navigate("/password-reset")}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-all duration-200 hover:underline hover:translate-x-0.5"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm animate-shake">
                  <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5 animate-bounce-subtle" />
                  <p>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-glow hover:shadow-2xl active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 transition-all duration-300 group hover:translate-y-[-2px]"
                style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" color="white" />
                    <span>Signing in...</span>
                  </span>
                ) : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
