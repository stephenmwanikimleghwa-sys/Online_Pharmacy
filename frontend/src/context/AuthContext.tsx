import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import api from "../services/api";
import { notifyError, notifySuccess } from "../services/notification";
import { extractStructuredError } from "../utils/apiErrorDisplay";
import { useNavigate } from "react-router-dom";
import { prefetchOnLogin } from "../lib/prefetchOnLogin";
import { queryClient } from "../lib/queryClient";
import { clearApiCache } from "../lib/serviceWorker";

export const ACTIVE_BRANCH_STORAGE_KEY = "active_branch";

export interface User {
  id: number;
  username: string;
  email?: string;
  role: "admin" | "pharmacist" | "customer" | "cashier" | "auditor";
  first_name?: string;
  last_name?: string;
  pharmacy?: number;
  pharmacy_name?: string;
  branch?: number | null;
  home_branch?: { id: number; name: string } | null;
  branch_info?: { id: number; name: string; is_headquarters?: boolean; type?: string } | null;
  is_active?: boolean;
  must_change_password?: boolean;
  is_admin?: boolean;
  is_pharmacist?: boolean;
  is_customer?: boolean;
  user_type?: string;
  [key: string]: unknown;
}

export interface BranchInfo {
  id: number;
  name: string;
  type?: string;
  subtitle?: string;
  is_headquarters?: boolean;
  is_active?: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  role?: string;
}

interface BranchSessionPayload {
  allowed_branches?: BranchInfo[];
  requires_branch_selection?: boolean;
  active_branch?: BranchInfo | null;
  home_branch?: BranchInfo | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  activeBranch: BranchInfo | null;
  allowedBranches: BranchInfo[];
  requiresBranchSelection: boolean;
  setActiveBranch: (branch: BranchInfo | null) => void;
  switchBranch: (branchId: number) => Promise<{ success: boolean; error?: unknown }>;
  login: (credentials: LoginCredentials) => Promise<{
    success: boolean;
    user?: User | null;
    error?: unknown;
    requiresBranchSelection?: boolean;
  }>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<{ success: boolean; user?: User; error?: unknown }>;
  getPostLoginPath: () => string;
  getDashboardPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/** True when the session/token is invalid (not a permission-denied 403). */
const isAuthRejection = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 401;
};

const normalizeUserRole = (
  data: Record<string, unknown> | null | undefined,
): User["role"] | null => {
  if (!data) return null;
  const role = data.role || data.user_type;
  if (data.is_pharmacist) return "pharmacist";
  if (data.is_admin) return "admin";
  if (data.is_customer) return "customer";
  return (role?.toString?.().toLowerCase?.() as User["role"]) || null;
};

const persistActiveBranch = (branch: BranchInfo | null) => {
  if (branch) {
    localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, JSON.stringify(branch));
  } else {
    localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
  }
};

const readStoredActiveBranch = (): BranchInfo | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BranchInfo) : null;
  } catch {
    return null;
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("access_token"));
  const [loading, setLoading] = useState<boolean>(true);
  const [activeBranch, setActiveBranchState] = useState<BranchInfo | null>(readStoredActiveBranch());
  const [allowedBranches, setAllowedBranches] = useState<BranchInfo[]>([]);
  const [requiresBranchSelection, setRequiresBranchSelection] = useState(false);
  const navigate = useNavigate();
  /** Skip duplicate profile fetch when login() or switchBranch() just set the token. */
  const skipVerifyAfterLoginRef = useRef(0);

  const applyBranchSession = useCallback((session: BranchSessionPayload) => {
    setAllowedBranches(session.allowed_branches || []);
    setRequiresBranchSelection(Boolean(session.requires_branch_selection));
    const branch = session.active_branch ?? null;
    setActiveBranchState(branch);
    persistActiveBranch(branch);
  }, []);

  /** Pharmacists/cashiers always get their branch auto-assigned — never the admin picker. */
  const applyStaffBranchSession = useCallback((session: BranchSessionPayload) => {
    const branches = session.allowed_branches || [];
    const home = session.home_branch;
    const active =
      session.active_branch ??
      (branches.length >= 1 ? branches[0] : null) ??
      (home?.id ? home : null);
    setAllowedBranches(branches);
    setActiveBranchState(active);
    persistActiveBranch(active);
    setRequiresBranchSelection(false);
  }, []);

  const applyBranchSessionForRole = useCallback(
    (session: BranchSessionPayload, role: string | null | undefined) => {
      const normalized = role?.toString?.().toLowerCase?.();
      if (normalized === "pharmacist" || normalized === "cashier" || normalized === "auditor") {
        applyStaffBranchSession(session);
      } else {
        applyBranchSession(session);
      }
    },
    [applyBranchSession, applyStaffBranchSession],
  );

  const setActiveBranch = useCallback((branch: BranchInfo | null) => {
    setActiveBranchState(branch);
    persistActiveBranch(branch);
    if (branch) {
      setRequiresBranchSelection(false);
    }
  }, []);

  const mergeUserFromProfile = useCallback(
    (profileData: Record<string, unknown>, session?: BranchSessionPayload) => {
      const role = normalizeUserRole(profileData);
      const merged: User = { ...profileData, role: role || (profileData.role as User["role"]) } as User;
      setUser(merged);
      if (merged.role) {
        localStorage.setItem("user_role", merged.role);
      }
      if (session) {
        applyBranchSessionForRole(session, merged.role);
      }
      return merged;
    },
    [applyBranchSessionForRole],
  );

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      if (skipVerifyAfterLoginRef.current > 0) {
        skipVerifyAfterLoginRef.current -= 1;
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get("/auth/profile/");
        const profileData = (response.data?.user || response.data?.profile || response.data) as Record<
          string,
          unknown
        >;
        // Cache the profile so the app can hydrate the session offline.
        try { localStorage.setItem("cached_profile", JSON.stringify(profileData)); } catch { /* non-fatal */ }
        const merged = mergeUserFromProfile(profileData, {
          allowed_branches: profileData.allowed_branches as BranchInfo[] | undefined,
          requires_branch_selection: profileData.requires_branch_selection as boolean | undefined,
          active_branch: profileData.active_branch as BranchInfo | null | undefined,
        });
        const profileRole = merged.role?.toString?.().toLowerCase?.();
        const branches = (profileData.allowed_branches as BranchInfo[] | undefined) || [];
        if (
          (profileRole === "admin" || merged.is_admin) &&
          branches.length > 1 &&
          !profileData.active_branch
        ) {
          setRequiresBranchSelection(true);
          setActiveBranchState(null);
          persistActiveBranch(null);
        }
      } catch (error) {
        const hasResponse = !!(error as { response?: unknown })?.response;
        if (isAuthRejection(error)) {
          notifyError(
            "Session Expired",
            "You were logged out after a period of inactivity. Please log in again.",
            "Log In Again",
            () => {
              window.location.href = "/login";
            },
          );
          setToken(null);
          setUser(null);
          setActiveBranchState(null);
          setAllowedBranches([]);
          setRequiresBranchSelection(false);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_role");
          localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
          try { localStorage.removeItem("cached_profile"); } catch { /* non-fatal */ }
        } else if (!hasResponse) {
          // Network failure (offline or server unreachable). Hydrate from the
          // last-known profile so the app stays usable without a round-trip.
          try {
            const raw = localStorage.getItem("cached_profile");
            if (raw) {
              const profileData = JSON.parse(raw) as Record<string, unknown>;
              mergeUserFromProfile(profileData, {
                allowed_branches: profileData.allowed_branches as BranchInfo[] | undefined,
                requires_branch_selection: false,
                active_branch: readStoredActiveBranch(),
              });
            }
          } catch { /* cached data unreadable — stay logged out */ }
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token, mergeUserFromProfile]);

  const switchBranch = async (branchId: number) => {
    try {
      const response = await api.post(
        "/auth/switch-branch/",
        { branch_id: branchId },
        { skipGlobalErrorNotification: true },
      );
      const payload = response.data?.data ?? response.data;
      const { active_branch: branch, tokens, requires_branch_selection: reqSelection } = payload || {};
      if (tokens?.access) {
        skipVerifyAfterLoginRef.current = 2;
        setToken(tokens.access);
        localStorage.setItem("access_token", tokens.access);
      }
      if (tokens?.refresh) {
        localStorage.setItem("refresh_token", tokens.refresh);
      }
      if (branch) {
        setActiveBranch(branch);
        notifySuccess(
          "Branch Switched",
          `You are now working at ${branch.name}. All transactions will be recorded here.`,
        );
        void prefetchOnLogin(branch.id, user?.role);
      }
      if (payload?.allowed_branches) {
        setAllowedBranches(payload.allowed_branches);
      }
      setRequiresBranchSelection(Boolean(reqSelection));
      return { success: true };
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } };
      return { success: false, error: err.response?.data || "Failed to switch branch" };
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      // Clear stale branch from a previous session so it cannot skip selection
      localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);

      const response = await api.post(
        "/auth/login/",
        {
          username: credentials.username,
          password: credentials.password,
          role: credentials.role,
        },
        { skipGlobalErrorNotification: true },
      );

      const resp = response.data || {};
      const tokens = resp.tokens || {};
      const access = tokens.access || resp.access || resp.token || resp.access_token;
      const refresh = tokens.refresh || resp.refresh;

      let needsBranchSelection = Boolean(resp.requires_branch_selection);

      let finalUser: User | null = null;
      let resolvedRole: User["role"] | null = null;
      const loginUser = resp.user;
      if (loginUser && typeof loginUser === "object") {
        const role = normalizeUserRole(loginUser as Record<string, unknown>);
        const loginRecord = loginUser as Record<string, unknown>;
        resolvedRole = role || ((loginUser as User).role as User["role"] | undefined) || null;
        if (!resolvedRole && loginRecord.is_admin) resolvedRole = "admin";
        if (!resolvedRole && loginRecord.is_pharmacist) resolvedRole = "pharmacist";
        finalUser = { ...(loginUser as User), role: resolvedRole as User["role"] };
        setUser(finalUser);
        if (finalUser.role) {
          localStorage.setItem("user_role", finalUser.role);
        }
      }

      const loginHome = (loginUser as { home_branch?: BranchInfo } | undefined)?.home_branch;
      applyBranchSessionForRole(
        {
          allowed_branches: resp.allowed_branches,
          requires_branch_selection: resp.requires_branch_selection,
          active_branch: resp.active_branch ?? null,
          home_branch: loginHome ?? null,
        },
        resolvedRole || finalUser?.role,
      );

      if (access) {
        localStorage.setItem("access_token", access);
        skipVerifyAfterLoginRef.current = 2;
        setToken(access);
      }
      if (refresh) {
        localStorage.setItem("refresh_token", refresh);
      }

      if (finalUser?.role?.toString?.().toLowerCase?.() === "pharmacist") {
        needsBranchSelection = false;
        setRequiresBranchSelection(false);
      }

      setLoading(false);

      try {
        const profileRes = await api.get("/auth/profile/");
        const profileData = profileRes.data?.user || profileRes.data?.profile || profileRes.data;
        finalUser = mergeUserFromProfile(profileData, {
          allowed_branches: profileData.allowed_branches,
          requires_branch_selection: profileData.requires_branch_selection,
          active_branch: profileData.active_branch,
          home_branch: profileData.home_branch as BranchInfo | null | undefined,
        });
        const profileRole = finalUser?.role?.toString?.().toLowerCase?.();
        if (
          profileData.requires_branch_selection !== undefined &&
          profileRole !== "pharmacist" &&
          profileRole !== "cashier" &&
          profileRole !== "auditor"
        ) {
          needsBranchSelection = Boolean(profileData.requires_branch_selection);
        }
        if (profileRole === "pharmacist" || profileRole === "cashier" || profileRole === "auditor") {
          needsBranchSelection = false;
          setRequiresBranchSelection(false);
        }
      } catch {
        // Continue with user payload from login response
      }

      // Admin with multiple branches must pick before dashboard (API is source of truth)
      const role = finalUser?.role?.toString?.().toLowerCase?.();
      const branchCount = (resp.allowed_branches || []).length;
      if ((role === "admin" || finalUser?.is_admin) && branchCount > 1) {
        needsBranchSelection = true;
        setRequiresBranchSelection(true);
        setActiveBranchState(null);
        persistActiveBranch(null);
      }

      const branchLabel =
        resp.active_branch?.name || finalUser?.branch_info?.name || "your branch";
      notifySuccess(
        `Welcome back, ${finalUser?.username || credentials.username}`,
        `You are now logged in at ${branchLabel}.`,
      );

      const branchIdForPrefetch =
        resp.active_branch?.id ??
        finalUser?.branch_info?.id ??
        (resp.allowed_branches?.length === 1 ? resp.allowed_branches[0]?.id : undefined);
      if (branchIdForPrefetch && !needsBranchSelection) {
        void prefetchOnLogin(branchIdForPrefetch, finalUser?.role);
      }

      return {
        success: true,
        user: finalUser,
        requiresBranchSelection: needsBranchSelection,
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      const data = err.response?.data;
      const structured = extractStructuredError(data);
      if (structured) {
        return { success: false, error: structured };
      }
      if (data) {
        return { success: false, error: data };
      }
      return { success: false, error: { detail: err.message || "Login failed" } };
    }
  };

  const logout = () => {
    notifySuccess("Logged Out", "You have been logged out safely.");
    queryClient.clear();
    // Purge the service worker's cached API reads so the next user on a shared
    // machine cannot see the previous user's data.
    clearApiCache();
    setToken(null);
    setUser(null);
    setActiveBranchState(null);
    setAllowedBranches([]);
    setRequiresBranchSelection(false);

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
    // The React Query cache is persisted to localStorage (see main.jsx) so it
    // survives reboots for offline reads; clear it on logout so the next user
    // on a shared machine can't see the previous user's cached data.
    localStorage.removeItem("TRANSCOUNTY_QUERY_CACHE");

    document.cookie.split(";").forEach((cookie) => {
      document.cookie = cookie
        .replace(/^ +/, "")
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });

    navigate("/");
  };

  const resolveRole = useCallback((): string | null => {
    if (!user) return null;
    let role = user.role?.toString?.().toLowerCase?.();
    if (!role && user.user_type) role = user.user_type.toString().toLowerCase();
    if (!role) {
      if (user.is_pharmacist) role = "pharmacist";
      else if (user.is_admin) role = "admin";
      else if (user.is_customer) role = "customer";
    }
    return role || null;
  }, [user]);

  const getPostLoginPath = useCallback((): string => {
    if (!user) return "/";
    if (user.must_change_password) return "/force-password-change";
    if (requiresBranchSelection) return "/branch/select";

    const role = resolveRole();
    if (
      (role === "admin" || user.is_admin) &&
      !activeBranch?.id &&
      allowedBranches.length > 1
    ) {
      return "/branch/select";
    }
    if (role === "admin") return "/admin/dashboard";
    if (role === "pharmacist") return "/branch/dashboard";
    if (role === "cashier") return "/cashier/dashboard";
    if (role === "auditor") return "/reports";
    if (role === "customer") return "/customer/dashboard";
    return "/";
  }, [user, requiresBranchSelection, resolveRole, activeBranch, allowedBranches.length]);

  const getDashboardPath = useCallback((): string => getPostLoginPath(), [getPostLoginPath]);

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const response = await api.patch("/auth/profile/", profileData);
      setUser(response.data);
      return { success: true, user: response.data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } };
      return { success: false, error: err.response?.data || "Update failed" };
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    updateProfile,
    getDashboardPath,
    getPostLoginPath,
    isAuthenticated: Boolean(token && user),
    loading,
    activeBranch,
    allowedBranches,
    requiresBranchSelection,
    setActiveBranch,
    switchBranch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
