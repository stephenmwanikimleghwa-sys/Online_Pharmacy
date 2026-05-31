import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

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

  const applyBranchSession = useCallback((session: BranchSessionPayload) => {
    setAllowedBranches(session.allowed_branches || []);
    setRequiresBranchSelection(Boolean(session.requires_branch_selection));
    const branch = session.active_branch ?? null;
    setActiveBranchState(branch);
    persistActiveBranch(branch);
  }, []);

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
        applyBranchSession(session);
      }
      return merged;
    },
    [applyBranchSession],
  );

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get("/auth/profile/");
        const profileData = (response.data?.user || response.data?.profile || response.data) as Record<
          string,
          unknown
        >;
        mergeUserFromProfile(profileData, {
          allowed_branches: profileData.allowed_branches as BranchInfo[] | undefined,
          requires_branch_selection: profileData.requires_branch_selection as boolean | undefined,
          active_branch: profileData.active_branch as BranchInfo | null | undefined,
        });
      } catch (error) {
        console.error("Token verification failed:", error);
        setToken(null);
        setUser(null);
        setActiveBranchState(null);
        setAllowedBranches([]);
        setRequiresBranchSelection(false);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
      }
      setLoading(false);
    };

    verifyToken();
  }, [token, mergeUserFromProfile]);

  const switchBranch = async (branchId: number) => {
    try {
      const response = await api.post("/auth/switch-branch/", { branch_id: branchId });
      const { active_branch: branch, tokens } = response.data || {};
      if (tokens?.access) {
        setToken(tokens.access);
        localStorage.setItem("access_token", tokens.access);
      }
      if (tokens?.refresh) {
        localStorage.setItem("refresh_token", tokens.refresh);
      }
      if (branch) {
        setActiveBranch(branch);
      }
      setRequiresBranchSelection(false);
      return { success: true };
    } catch (error: unknown) {
      console.error("Switch branch failed:", error);
      const err = error as { response?: { data?: unknown } };
      return { success: false, error: err.response?.data || "Failed to switch branch" };
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await api.post("/auth/login/", {
        username: credentials.username,
        password: credentials.password,
        role: credentials.role,
      });

      const resp = response.data || {};
      const tokens = resp.tokens || {};
      const access = tokens.access || resp.access || resp.token || resp.access_token;
      const refresh = tokens.refresh || resp.refresh;

      if (access) {
        setToken(access);
        localStorage.setItem("access_token", access);
      }
      if (refresh) {
        localStorage.setItem("refresh_token", refresh);
      }

      applyBranchSession({
        allowed_branches: resp.allowed_branches,
        requires_branch_selection: resp.requires_branch_selection,
        active_branch: resp.active_branch,
      });

      let finalUser: User | null = null;
      const loginUser = resp.user;
      if (loginUser && typeof loginUser === "object") {
        const role = normalizeUserRole(loginUser);
        if (role) {
          finalUser = { ...loginUser, role } as User;
        }
      }

      try {
        const profileRes = await api.get("/auth/profile/");
        const profileData = profileRes.data?.user || profileRes.data?.profile || profileRes.data;
        finalUser = mergeUserFromProfile(profileData, {
          allowed_branches: profileData.allowed_branches,
          requires_branch_selection: profileData.requires_branch_selection,
          active_branch: profileData.active_branch,
        });
      } catch {
        if (finalUser) {
          setUser(finalUser);
          if (finalUser.role) localStorage.setItem("user_role", finalUser.role);
        }
      }

      if (credentials.role && finalUser?.role && finalUser.role !== credentials.role) {
        console.warn(
          `Logged-in user role mismatch: requested=${credentials.role} returned=${finalUser.role}`,
        );
      }

      return {
        success: true,
        user: finalUser,
        requiresBranchSelection: Boolean(resp.requires_branch_selection),
      };
    } catch (error: unknown) {
      console.error("Login failed:", error);
      const err = error as { response?: { data?: unknown }; message?: string };
      if (err.response?.data) {
        return { success: false, error: err.response.data };
      }
      return { success: false, error: { detail: err.message || "Login failed" } };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setActiveBranchState(null);
    setAllowedBranches([]);
    setRequiresBranchSelection(false);

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);

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
    if (role === "admin") return "/admin/dashboard";
    if (role === "pharmacist") return "/branch/dashboard";
    if (role === "cashier") return "/cashier/dashboard";
    if (role === "auditor") return "/reports";
    if (role === "customer") return "/customer/dashboard";
    return "/";
  }, [user, requiresBranchSelection, resolveRole]);

  const getDashboardPath = useCallback((): string => getPostLoginPath(), [getPostLoginPath]);

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const response = await api.patch("/auth/profile/", profileData);
      setUser(response.data);
      return { success: true, user: response.data };
    } catch (error: unknown) {
      console.error("Profile update failed:", error);
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
    isAuthenticated: !!token && !!user,
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
