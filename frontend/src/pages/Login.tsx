import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, LoginCredentials, User } from '../context/AuthContext';
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from '../components/LoadingSpinner';

/* ─── Inline styles (no Tailwind needed) ─────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #9b59b6 0%, #8e44ad 25%, #e056a0 65%, #d98ee6 100%)",
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
    background: "rgba(230, 200, 230, 0.35)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    border: "1px solid rgba(255,255,255,0.3)",
    boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
  },
  // ── LEFT PANEL ──────────────────────────────────────────────────────────
  leftPanel: {
    flex: "0 0 45%",
    position: "relative",
    overflow: "hidden",
    borderRadius: "16px",
    background: "linear-gradient(145deg, #1a0533 0%, #2d0b6b 30%, #4a0e8f 55%, #6b0f5e 80%, #1a0533 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  // ── RIGHT PANEL ─────────────────────────────────────────────────────────
  rightPanel: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 36px",
  },
  title: {
    fontSize: "2.2rem",
    fontWeight: 400,
    color: "#3b2045",
    marginBottom: "32px",
    textAlign: "center",
    letterSpacing: "0.02em",
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
    marginBottom: "20px",
  },
  input: {
    width: "100%",
    border: "none",
    borderBottom: "1.5px solid #9b6eae",
    background: "transparent",
    padding: "10px 36px 10px 0",
    fontSize: "0.95rem",
    color: "#3b2045",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  inputIcon: {
    position: "absolute",
    right: "2px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9b6eae",
    fontSize: "1rem",
  },
  loginBtn: {
    display: "block",
    marginLeft: "auto",
    marginTop: "8px",
    padding: "10px 32px",
    background: "#1a0a2e",
    color: "#fff",
    border: "none",
    borderRadius: "24px",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "background 0.2s, transform 0.15s",
  },
  footerLinks: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    marginTop: "20px",
  },
  footerLink: {
    fontSize: "0.8rem",
    color: "#7a4d8a",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    fontFamily: "inherit",
    textDecoration: "none",
  },
  errorBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    padding: "10px 14px",
    background: "rgba(220,38,38,0.08)",
    border: "1px solid rgba(220,38,38,0.2)",
    borderRadius: "10px",
    color: "#b91c1c",
    fontSize: "0.85rem",
    marginBottom: "12px",
    width: "100%",
    boxSizing: "border-box",
  },
};

/* ─── Animated orbs canvas (CSS-only, no canvas API) ─────────────────── */
const OrbsPanel: React.FC = () => (
  <div style={styles.leftPanel}>
    {/* Orb layers */}
    <div style={{
      position: "absolute", width: "260px", height: "260px", borderRadius: "50%",
      background: "radial-gradient(circle at 35% 35%, rgba(255,100,60,0.85), rgba(180,30,140,0.7) 55%, rgba(60,10,120,0.5) 85%)",
      top: "10%", left: "5%",
      boxShadow: "inset -20px -20px 40px rgba(0,0,0,0.4), inset 10px 10px 30px rgba(255,180,100,0.3)",
      animation: "orbFloat1 8s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", width: "200px", height: "200px", borderRadius: "50%",
      background: "radial-gradient(circle at 40% 30%, rgba(200,80,220,0.8), rgba(100,20,180,0.6) 60%, rgba(20,5,80,0.4) 90%)",
      top: "30%", left: "35%",
      boxShadow: "inset -15px -15px 35px rgba(0,0,0,0.35), inset 8px 8px 20px rgba(220,130,255,0.2)",
      animation: "orbFloat2 10s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", width: "150px", height: "150px", borderRadius: "50%",
      background: "radial-gradient(circle at 38% 32%, rgba(255,140,40,0.9), rgba(220,60,100,0.7) 50%, rgba(80,10,150,0.5) 85%)",
      bottom: "18%", left: "10%",
      boxShadow: "inset -12px -12px 30px rgba(0,0,0,0.35), inset 6px 6px 15px rgba(255,200,100,0.3)",
      animation: "orbFloat3 7s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", width: "90px", height: "90px", borderRadius: "50%",
      background: "radial-gradient(circle at 40% 35%, rgba(180,180,255,0.5), rgba(100,50,200,0.4) 60%, transparent 85%)",
      bottom: "10%", right: "15%",
      boxShadow: "inset -8px -8px 20px rgba(0,0,0,0.3)",
      animation: "orbFloat4 9s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", width: "60px", height: "60px", borderRadius: "50%",
      background: "radial-gradient(circle at 38% 35%, rgba(255,80,120,0.6), rgba(150,20,180,0.4) 60%, transparent 80%)",
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
      background: "radial-gradient(circle, rgba(255,80,200,0.35), transparent 70%)",
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

/* ─── Main component ──────────────────────────────────────────────────── */
const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({ username: "", password: "" });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [hoveredBtn, setHoveredBtn] = useState(false);
  const { login, isAuthenticated, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) navigate(getDashboardPath());
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
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Left – animated orbs */}
        <OrbsPanel />

        {/* Right – form */}
        <div style={styles.rightPanel}>
          <h1 style={styles.title}>Login</h1>

          <form onSubmit={handleSubmit} style={{ width: "100%" }}>
            {/* Email / Username */}
            <div style={styles.inputWrapper}>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={credentials.username}
                onChange={handleChange}
                placeholder="Email"
                style={styles.input}
              />
              <span style={styles.inputIcon}>✉</span>
            </div>

            {/* Password */}
            <div style={styles.inputWrapper}>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={credentials.password}
                onChange={handleChange}
                placeholder="password"
                style={styles.input}
              />
              <span style={styles.inputIcon}>🔒</span>
            </div>

            {/* Error */}
            {error && (
              <div style={styles.errorBox}>
                <ExclamationCircleIcon style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginBtn,
                background: hoveredBtn ? "#2d1060" : "#1a0a2e",
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

          {/* Footer links */}
          <div style={styles.footerLinks}>
            <button style={styles.footerLink} onClick={() => navigate("/register")}>
              Creat an account
            </button>
            <button style={styles.footerLink} onClick={() => navigate("/password-reset")}>
              Forgot your password
            </button>
          </div>
        </div>
      </div>

      {/* Responsive tweak for small screens */}
      <style>{`
        @media (max-width: 600px) {
          .login-card-left { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default Login;
