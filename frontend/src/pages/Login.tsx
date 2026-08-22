import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth, LoginCredentials, User } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from '../components/LoadingSpinner';
import { getLoginErrorDisplay } from '../utils/apiErrorDisplay';

const BrandPanel: React.FC = () => (
  <div
    className="login-card-left hidden sm:flex flex-col justify-between p-8 md:p-10"
    style={{
      flex: "0 0 42%",
      background: "linear-gradient(160deg, var(--color-accent) 0%, var(--color-primary) 55%, #146b62 100%)",
      color: "#fff",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse 80% 60% at 10% 20%, rgba(255,255,255,0.12), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 90%, rgba(0,0,0,0.18), transparent 50%)",
        pointerEvents: "none",
      }}
    />
    <div className="relative z-10">
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center font-display font-bold text-sm mb-6"
        style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}
      >
        TP
      </div>
      <h2 className="font-display font-bold text-3xl tracking-tight leading-tight mb-3">
        Transcounty
      </h2>
      <p className="text-sm leading-relaxed max-w-[16rem]" style={{ color: "rgba(255,255,255,0.85)" }}>
        Sign in to manage sales, stock, prescriptions, and finance for your branch.
      </p>
    </div>
    <p className="relative z-10 text-xs font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
      Staff operations · Kenya
    </p>
  </div>
);

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({ username: "", password: "" });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const { login, isAuthenticated, getPostLoginPath, loading: authLoading } = useAuth();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  const skipSessionRedirect = useRef(false);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (skipSessionRedirect.current) return;
    if (!authLoading && isAuthenticated) {
      navigate(getPostLoginPath(), { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, getPostLoginPath]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOffline) {
      setError(
        "You're offline. Signing in needs an internet connection. Once you've signed in, the app keeps working offline.",
      );
      return;
    }

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

      let target = "/";
      const role = determineRole(returnedUser);
      if (result.requiresBranchSelection && role === "admin") {
        target = "/branch/select";
      } else if (returnedUser?.must_change_password) {
        target = "/force-password-change";
      } else {
        if (role === "admin") {
          target = "/admin/dashboard";
        } else if (role === "pharmacist") {
          target = "/branch/dashboard";
        } else if (role === "cashier") {
          target = "/cashier/dashboard";
        } else if (role === "auditor") {
          target = "/reports";
        } else if (role === "customer") {
          target = "/customer/dashboard";
        } else {
          const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
          target = from && from !== "/login" ? from : "/";
        }
      }

      skipSessionRedirect.current = true;
      navigate(target, { replace: true });
    } else {
      const display = getLoginErrorDisplay(result.error);
      setError(display.message || "Invalid username or password, try again.");
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: isDark ? "var(--bg-gradient-dark)" : "var(--bg-gradient-light)",
        fontFamily: "var(--font-body)",
      }}
    >
      <div
        className="flex w-full max-w-[820px] min-h-[380px] overflow-hidden"
        style={{
          borderRadius: "var(--radius-surface)",
          background: isDark ? "var(--color-bg-card-dark)" : "var(--color-bg-card-light)",
          border: `1px solid ${isDark ? "var(--color-border-dark)" : "var(--color-border-light)"}`,
          boxShadow: isDark ? "0 20px 48px rgba(0,0,0,0.35)" : "0 16px 40px rgba(20,32,30,0.1)",
        }}
      >
        <BrandPanel />

        <div className="flex-1 flex flex-col justify-center px-8 py-10 md:px-10">
          <div className="sm:hidden flex items-center gap-2 mb-6">
            <div className="nav-logo-mark w-8 h-8 flex items-center justify-center text-white font-display font-bold text-xs">
              TP
            </div>
            <span className="font-display font-bold text-base" style={{ color: "var(--text-primary)" }}>
              Transcounty
            </span>
          </div>

          <h1
            className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            Sign in
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--text-secondary)" }}>
            Use your staff account to open the workspace.
          </p>

          {isOffline && (
            <div
              role="status"
              className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-sm mb-4"
              style={{
                background: isDark ? "rgba(251,191,36,0.12)" : "rgba(217,119,6,0.08)",
                border: isDark ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(217,119,6,0.25)",
                color: isDark ? "#fde68a" : "#b45309",
              }}
            >
              <ExclamationCircleIcon className="w-[18px] h-[18px] flex-shrink-0 mt-0.5" />
              <span>
                You&rsquo;re offline. Signing in needs a connection — once signed in, the app keeps working without internet.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Username or email
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                value={credentials.username}
                onChange={handleChange}
                className="form-input w-full"
                placeholder="staff@branch.co.ke"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={credentials.password}
                  onChange={handleChange}
                  className="form-input w-full pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: "var(--text-secondary)" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlashIcon className="w-[18px] h-[18px]" /> : <EyeIcon className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 px-3.5 py-2.5 rounded-lg text-sm"
                style={{
                  background: isDark ? "rgba(248,113,113,0.12)" : "rgba(220,38,38,0.08)",
                  border: isDark ? "1px solid rgba(248,113,113,0.25)" : "1px solid rgba(220,38,38,0.2)",
                  color: isDark ? "#fecaca" : "#b91c1c",
                }}
              >
                <ExclamationCircleIcon className="w-[18px] h-[18px] flex-shrink-0 mt-0.5" />
                <span>{typeof error === "string" ? error : (error as { message?: string })?.message || "Sign-in failed"}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isOffline}
              className="btn-primary w-full py-3 rounded-lg text-white font-semibold text-sm disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" color="white" />
                  Signing in…
                </span>
              ) : isOffline ? (
                "Offline"
              ) : (
                "Sign in"
              )}
            </button>

            <div className="flex justify-between text-xs pt-1">
              <Link to="/" style={{ color: "var(--text-secondary)" }}>
                Back
              </Link>
              <Link to="/password-reset" style={{ color: "var(--color-primary)" }} className="font-semibold">
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
