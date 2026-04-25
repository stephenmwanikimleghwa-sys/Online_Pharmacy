import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

// Define User interface
export interface User {
  id: number;
  username: string;
  email: string;
  role: "admin" | "pharmacist" | "customer" | "cashier" | "auditor";
  pharmacy?: number;
  pharmacy_name?: string;
  is_active?: boolean;
  must_change_password?: boolean;
  is_admin?: boolean;
  is_pharmacist?: boolean;
  is_customer?: boolean;
  user_type?: string;
  [key: string]: any;
}

// Define Login Credentials interface
export interface LoginCredentials {
  username: string;
  password: string;
  role?: string;
}

// Define AuthContext interface
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; user?: User | null; error?: any }>;
  logout: () => void;
  updateProfile: (profileData: Partial<User>) => Promise<{ success: boolean; user?: User; error?: any }>;
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

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("access_token"));
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // NOTE: We reuse the shared `api` instance (from services/api.js)
  // which already reads the token from localStorage in a request interceptor.

  // Check if token is valid on app load
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await api.get("/auth/profile");
          // normalize response: some APIs return the user directly, others wrap it
          const profile = response.data?.user || response.data?.profile || response.data;
          setUser(profile);
        } catch (error) {
          console.error("Token verification failed:", error);
          // clear token and user on failure
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = async (credentials: LoginCredentials) => {
    try {
      // Include role in login request (backend may ignore it)
      const response = await api.post("/auth/login/", {
        username: credentials.username,
        password: credentials.password,
        role: credentials.role,
      });

      const resp = response.data || {};
      const access = resp.access || resp.token || resp.access_token;
      const userData = resp.user || resp.profile || resp.user_data || resp;

      // store token if present
      if (access) {
        setToken(access);
        localStorage.setItem("access_token", access);
      }

      // Extract and normalize user role from response data
      const normalizeUserRole = (data: any): "admin" | "pharmacist" | "customer" | "cashier" | "auditor" | null => {
        // Check various possible role fields
        const role = data?.role || data?.user_type || null;

        // Check for boolean flags
        if (data?.is_pharmacist) return 'pharmacist';
        if (data?.is_admin) return 'admin';
        if (data?.is_customer) return 'customer';

        return role?.toString?.().toLowerCase?.() || null;
      };

      // Always attempt to fetch the full profile after login
      let finalUser: User | null = null;
      try {
        // First try to use the user data from login response
        if (userData && typeof userData === "object") {
          const initialRole = normalizeUserRole(userData);
          if (initialRole) {
            finalUser = { ...userData, role: initialRole } as User;
          }
        }

        // Then fetch the full profile to ensure we have complete data
        const profileRes = await api.get("/auth/profile");
        const profileData = profileRes.data?.user || profileRes.data?.profile || profileRes.data;
      } catch (profileErr: any) {
        // If we have userData from login, use that as fallback
        if (!finalUser && userData && typeof userData === "object") {
          const fallbackRole = normalizeUserRole(userData);
          if (fallbackRole) {
            finalUser = { ...userData, role: fallbackRole } as User;
          }
        }
      }

      if (finalUser) {
        // If requested role provided, only warn if mismatch; don't throw to avoid crashing
        if (credentials.role && finalUser.role && finalUser.role !== credentials.role) {
          console.warn(
            `Logged-in user role mismatch: requested=${credentials.role} returned=${finalUser.role}`,
          );
        }
        setUser(finalUser);
        if (finalUser.role) localStorage.setItem("user_role", finalUser.role);
      }

      return { success: true, user: finalUser || null };
    } catch (error: any) {
      console.error("Login failed:", error);

      // Prefer the server response body when available (it may contain
      // field-level validation errors like { username: [...], password: [...] }
      // or non_field_errors/details for auth failures). Return it as-is so
      // the UI can render specific messages.
      const serverData = error?.response?.data;

      if (serverData) {
        return { success: false, error: serverData };
      }

      // Fallback to axios message
      return { success: false, error: { detail: error?.message || "Login failed" } };
    }
  };

  // Registration endpoint removed — registration is disabled in the client.

  const logout = () => {
    // Clear auth state
    setToken(null);
    setUser(null);

    // Clear all auth-related items from localStorage
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_role");

    // Clear any auth-related cookies if they exist
    document.cookie.split(";").forEach(cookie => {
      document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Redirect to home page
    navigate("/");
  };

  const getDashboardPath = (): string => {
    if (!user) {
      return "/";
    }

    try {
      // First check explicit role field
      let role = user.role?.toString?.().toLowerCase?.();

      // Then check user_type if role not found
      if (!role && user.user_type) {
        role = user.user_type.toString().toLowerCase();
      }

      // Check boolean flags if still no role
      if (!role) {
        if (user.is_pharmacist) role = 'pharmacist';
        else if (user.is_admin) role = 'admin';
        else if (user.is_customer) role = 'customer';
      }

      console.warn(`[Auth Debug] Unknown role "${role}", using default path`);

      let path = "/";
      switch (role) {
        case "pharmacist":
          path = "/pharmacist/dashboard";  // Updated to match route structure
          break;
        case "admin":
          path = "/admin/dashboard";  // Consistent route structure
          break;
        case "cashier":
          path = "/cashier/dashboard";
          break;
        case "auditor":
          path = "/reports"; // Auditors go to reports by default
          break;
        case "customer":
          path = "/customer/dashboard";
          break;
        default:
          if (user.is_pharmacist) {
            path = "/pharmacist/dashboard";
          } else if (user.is_admin) {
            path = "/admin/dashboard";
          } else {
            console.warn(`[Auth Debug] Unknown role "${role}", using default path`);
            path = "/customer/dashboard";  // Default to customer dashboard if role is unknown
          }
      }

      return path;
    } catch (error) {
      console.error("[Auth Debug] Error getting dashboard path:", error);
      return "/";
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const response = await api.patch("/auth/profile/", profileData);
      setUser(response.data);
      return { success: true, user: response.data };
    } catch (error: any) {
      console.error("Profile update failed:", error);
      return { success: false, error: error.response?.data || "Update failed" };
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    updateProfile,
    getDashboardPath,
    isAuthenticated: !!token && !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
