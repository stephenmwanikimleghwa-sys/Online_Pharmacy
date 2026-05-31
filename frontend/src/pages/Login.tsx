import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, LoginCredentials, User } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from '../components/LoadingSpinner';

const getStyles = (isDark: boolean): any => ({
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: isDark
      ? "var(--bg-gradient-dark)"
      : "var(--bg-gradient-light)",
    padding: "24px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  card: {
    display: "flex",
    width: "100%",
    maxWidth: "820px",
    minHeight: "360px",
    borderRadius: "20px",
    overflow: "hidden",
    background: isDark
      ? "var(--color-bg-card-dark)"
      : "var(--color-bg-card-light)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    border: isDark
      ? "1px solid var(--color-border-dark)"
      : "1px solid var(--color-border-light)",
    boxShadow: isDark ? "0 25px 60px rgba(0,0,0,0.35)" : "0 25px 60px rgba(124,58,237,0.18)",
  },
  leftPanel: (isDark: boolean) => ({
    flex: "0 0 45%",
    position: "relative",
    overflow: "hidden",
    borderRadius: "16px",
    background: isDark
      ? "linear-gradient(145deg, #071224 0%, #102848 35%, #0d3a6f 65%, #071224 100%)"
      : "linear-gradient(145deg, #1a0533 0%, #2d0b6b 30%, #4a0e8f 55%, #6b0f5e 80%, #1a0533 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }),
  rightPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 36px",
  },
  title: (isDark: boolean) => ({
    fontSize: "2.2rem",
    fontWeight: 400,
    color: isDark ? "var(--color-text-dark)" : "var(--color-text-light)",
    marginBottom: "32px",
    textAlign: "center",
    letterSpacing: "0.02em",
  }),
  inputWrapper: {
    position: "relative",
    width: "100%",
    marginBottom: "20px",
  },
  input: (isDark: boolean) => ({
    width: "100%",
    border: "none",
    borderBottom: isDark
      ? `1.5px solid var(--color-border-dark)`
      : `1.5px solid var(--color-border-light)`,
    background: "transparent",
    padding: "10px 36px 10px 0",
    fontSize: "0.95rem",
    color: isDark ? "var(--color-text-dark)" : "var(--color-text-light)",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  }),
  inputIcon: (isDark: boolean) => ({
    position: "absolute",
    right: "2px",
    top: "50%",
    transform: "translateY(-50%)",
    color: isDark ? "var(--color-text-muted-dark)" : "var(--color-text-muted-light)",
    fontSize: "1rem",
  }),
  loginBtn: (isDark: boolean) => ({
    display: "block",
    marginLeft: "auto",
    marginTop: "8px",
    padding: "10px 32px",
    background: isDark ? "var(--btn-gradient-dark)" : "var(--btn-gradient-light)",
    color: "#fff",
    border: "none",
    borderRadius: "24px",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "opacity 0.2s, transform 0.15s",
  }),
  footerLinks: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    marginTop: "20px",
  },
  footerLink: (isDark: boolean) => ({
    fontSize: "0.8rem",
    color: isDark ? "var(--color-text-muted-dark)" : "var(--color-text-muted-light)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
    textDecoration: "none",
  }),
  errorBox: (isDark: boolean) => ({
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "10px 14px",
    background: isDark ? "rgba(248,113,113,0.12)" : "rgba(220,38,38,0.08)",
    border: isDark ? "1px solid rgba(248,113,113,0.25)" : "1px solid rgba(220,38,38,0.2)",
    borderRadius: "10px",
    color: isDark ? "#fecaca" : "#b91c1c",
    fontSize: "0.85rem",
    marginBottom: "12px",
    width: "100%",
    boxSizing: "border-box",
  }),
});

/* ─── Animated orbs canvas (CSS-only, no canvas API) ─────────────────── */
const OrbsPanel: React.FC<{ dark: boolean }> = ({ dark }) => {
  const styles = getStyles(dark);
  return (
    <div className="login-card-left" style={styles.leftPanel(dark)}>
    {/* Orb layers */}
    <div style={{
      position: "absolute", width: "260px", height: "260px", borderRadius: "50%",
      background: dark
        ? "radial-gradient(circle at 35% 35%, rgba(115, 170, 255, 0.9), rgba(90, 120, 240, 0.7) 55%, rgba(15, 35, 80, 0.55) 85%)"
        : "radial-gradient(circle at 35% 35%, rgba(255,100,60,0.85), rgba(180,30,140,0.7) 55%, rgba(60,10,120,0.5) 85%)",
      top: "10%", left: "5%",
      boxShadow: dark
        ? "inset -20px -20px 40px rgba(0,0,0,0.35), inset 10px 10px 30px rgba(90, 130, 255, 0.18)"
        : "inset -20px -20px 40px rgba(0,0,0,0.4), inset 10px 10px 30px rgba(255,180,100,0.3)",
      animation: "orbFloat1 8s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", width: "200px", height: "200px", borderRadius: "50%",
      background: dark
        ? "radial-gradient(circle at 40% 30%, rgba(120, 180, 255, 0.85), rgba(80, 130, 235, 0.65) 60%, rgba(10, 30, 60, 0.45) 90%)"
        : "radial-gradient(circle at 40% 30%, rgba(200,80,220,0.8), rgba(100,20,180,0.6) 60%, rgba(20,5,80,0.4) 90%)",
      top: "30%", left: "35%",
      boxShadow: dark
        ? "inset -15px -15px 35px rgba(0,0,0,0.34), inset 8px 8px 20px rgba(120, 170, 255, 0.15)"
        : "inset -15px -15px 35px rgba(0,0,0,0.35), inset 8px 8px 20px rgba(220,130,255,0.2)",
      animation: "orbFloat2 10s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", width: "150px", height: "150px", borderRadius: "50%",
      background: dark
        ? "radial-gradient(circle at 38% 32%, rgba(120, 205, 255, 0.9), rgba(100, 150, 255, 0.7) 50%, rgba(35, 55, 105, 0.6) 85%)"
        : "radial-gradient(circle at 38% 32%, rgba(255,140,40,0.9), rgba(220,60,100,0.7) 50%, rgba(80,10,150,0.5) 85%)",
      bottom: "18%", left: "10%",
      boxShadow: dark
        ? "inset -12px -12px 30px rgba(0,0,0,0.34), inset 6px 6px 15px rgba(120, 180, 255, 0.16)"
        : "inset -12px -12px 30px rgba(0,0,0,0.35), inset 6px 6px 15px rgba(255,200,100,0.3)",
      animation: "orbFloat3 7s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", width: "90px", height: "90px", borderRadius: "50%",
      background: dark
        ? "radial-gradient(circle at 40% 35%, rgba(155, 190, 255, 0.48), rgba(100, 110, 220, 0.38) 60%, transparent 85%)"
        : "radial-gradient(circle at 40% 35%, rgba(180,180,255,0.5), rgba(100,50,200,0.4) 60%, transparent 85%)",
      bottom: "10%", right: "15%",
      boxShadow: dark
        ? "inset -8px -8px 20px rgba(0,0,0,0.32)"
        : "inset -8px -8px 20px rgba(0,0,0,0.3)",
      animation: "orbFloat4 9s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", width: "60px", height: "60px", borderRadius: "50%",
      background: dark
        ? "radial-gradient(circle at 38% 35%, rgba(140, 165, 255, 0.6), rgba(120, 130, 255, 0.35) 60%, transparent 80%)"
        : "radial-gradient(circle at 38% 35%, rgba(255,80,120,0.6), rgba(150,20,180,0.4) 60%, transparent 80%)",
      top: "12%", right: "20%",
      animation: "orbFloat5 6s ease-in-out infinite",
    }} />
    {/* Glare highlight on large orb */}
    <div style={{
      position: "absolute", width: "80px", height: "40px", borderRadius: "50%",
      background: "rgba(255,255,255,0.15)",
      top: "17%", left: "12%",
      filter: "blur(6px)",
      transform: "rotate(-30deg)",
    }} />
    {/* Pink light leak */}
    <div style={{
      position: "absolute", bottom: 0, right: 0,
      width: "120px", height: "120px",
      background: "radial-gradient(circle, var(--pink-leak), transparent 70%)",
      filter: "blur(20px)",
    }} />

    <style>{`
      @keyframes orbFloat1 {
        0%,100% { transform: translate(0,0) scale(1); }
        33% { transform: translate(8px,-12px) scale(1.03); }
        66% { transform: translate(-6px,8px) scale(0.98); }
      }
      @keyframes orbFloat2 {
        0%,100% { transform: translate(0,0) scale(1); }
        40% { transform: translate(-10px,10px) scale(1.04); }
        70% { transform: translate(6px,-8px) scale(0.97); }
      }
      @keyframes orbFloat3 {
        0%,100% { transform: translate(0,0); }
        50% { transform: translate(10px,-10px); }
      }
      @keyframes orbFloat4 {
        0%,100% { transform: translate(0,0); }
        45% { transform: translate(-8px,8px); }
      }
      @keyframes orbFloat5 {
        0%,100% { transform: translate(0,0) scale(1); }
        50% { transform: translate(5px,6px) scale(1.1); }
      }
    `}</style>
  </div>
  );
};

/* ─── Main component ──────────────────────────────────────────────────── */
const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({ username: "", password: "" });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [hoveredBtn, setHoveredBtn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated, getPostLoginPath } = useAuth();
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const styles = getStyles(isDark);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) navigate(getPostLoginPath());
  }, [isAuthenticated, navigate, getPostLoginPath]);

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

      let target = "/";
      if (result.requiresBranchSelection) {
        target = "/branch/select";
      } else if (returnedUser?.must_change_password) {
        target = "/force-password-change";
      } else {
        const role = determineRole(returnedUser);
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
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Left – animated orbs */}
        <OrbsPanel dark={isDark} />

        {/* Right – form */}
        <div style={styles.rightPanel}>
          <h1 style={styles.title(isDark)}>Login</h1>

          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            {/* Username / Email */}
            <div style={styles.inputWrapper}>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={credentials.username}
                onChange={handleChange}
                placeholder="Username / Email Address"
                className="login-input"
                style={styles.input(isDark)}
              />
              <span style={styles.inputIcon(isDark)}>✉</span>
            </div>

            {/* Password */}
            <div style={styles.inputWrapper}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={credentials.password}
                onChange={handleChange}
                placeholder="Password"
                className="login-input"
                style={styles.input(isDark)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ ...styles.inputIcon(isDark), background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword
                  ? <EyeSlashIcon style={{ width: 18, height: 18 }} />
                  : <EyeIcon style={{ width: 18, height: 18 }} />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox(isDark)}>
                <ExclamationCircleIcon style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
                <span>{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginBtn(isDark),
                opacity: hoveredBtn ? 0.9 : 1,
                transform: hoveredBtn ? "translateY(-1px)" : "none",
              }}
              onMouseEnter={() => setHoveredBtn(true)}
              onMouseLeave={() => setHoveredBtn(false)}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <LoadingSpinner size="sm" color="white" />
                  Signing in…
                </span>
              ) : "Login"}
            </button>
          </form>


        </div>
      </div>

      {/* Responsive tweak for small screens */}
      <style>{`
        @media (max-width: 600px) {
          .login-card-left { display: none !important; }
        }
        .login-input::placeholder {
          color: ${isDark ? 'var(--color-text-muted-dark)' : 'var(--color-text-muted-light)'};
          opacity: 1;
        }
      `}</style>
    </div>
  );
};

export default Login;
