import React, { createContext, useContext, useState, useEffect } from "react";
import api, { API_BASE_URL } from "../services/api";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const [loading, setLoading] = useState(true);
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

  const login = async (credentials) => {
    try {
      // Include role in login request (backend may ignore it)
      const response = await api.post("/auth/login/", {
        username: credentials.username,
        password: credentials.password,
        role: credentials.role,
      });

      // support multiple response shapes
      const resp = response.data || {};
      const access = resp.access || resp.token || resp.access_token;
      const userData = resp.user || resp.profile || resp.user_data || resp;
      
      console.log('[Auth Debug] Login response:', {
        rawResponse: response.data,
        parsedAccess: access,
        parsedUser: userData
      });

      // store token if present
      if (access) {
        setToken(access);
        localStorage.setItem("access_token", access);
      }

      // Always attempt to fetch the full profile after login
      let finalUser = null;
      try {
        // First try to use the user data from login response
        if (userData && typeof userData === "object") {
          console.log('[Auth Debug] Initial user data from login:', userData);
          finalUser = userData;
        }
        
        // Then fetch the full profile to ensure we have complete data
        console.log('[Auth Debug] Fetching full profile...');
        const profileRes = await api.get("/auth/profile");
        const profileData = profileRes.data?.user || profileRes.data?.profile || profileRes.data;
        
        if (profileData && typeof profileData === "object") {
          console.log('[Auth Debug] Received profile data:', profileData);
          // Merge profile data with any existing user data
          finalUser = { ...finalUser, ...profileData };
        } else {
          console.warn('[Auth Debug] Profile endpoint returned invalid data:', profileRes.data);
        }
      } catch (profileErr) {
        console.error('[Auth Debug] Failed to fetch profile:', {
          error: profileErr.message,
          status: profileErr.response?.status,
          data: profileErr.response?.data
        });
        // If we have userData from login, use that as fallback
        if (!finalUser && userData && typeof userData === "object") {
          finalUser = userData;
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
    } catch (error) {
      console.error("Login failed:", error);
      const errorMessage =
        error?.response?.data?.detail || error?.message || "Login failed";
      return { success: false, error: { detail: errorMessage } };
    }
  };

  const register = async (formData) => {
    try {
      const response = await api.post("/auth/register/", formData);
      const resp = response.data || {};
      const access = resp.access || resp.token || resp.access_token;
      const userData = resp.user || resp.profile || resp.user_data || resp;

      if (access) {
        setToken(access);
        localStorage.setItem("access_token", access);
      }
      if (userData && typeof userData === "object") {
        setUser(userData);
        if (userData.role) localStorage.setItem("user_role", userData.role);
      }
      return { success: true, user: userData || null };
    } catch (error) {
      console.error("Registration failed:", error);
      return {
        success: false,
        error: error.response?.data || { detail: error.message || "Registration failed" },
      };
    }
  };

  const logout = () => {
    // Clear auth state
    setToken(null);
    setUser(null);
    
    // Clear all auth-related items from localStorage
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    
    // Clear any auth-related cookies if they exist
    document.cookie.split(";").forEach(cookie => {
      document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Redirect to home page
    navigate("/");
  };

  const getDashboardPath = () => {
    console.log('[Auth Debug] Getting dashboard path:', {
      user,
      role: user?.role
    });

    if (!user || !user.role) {
      console.warn('[Auth Debug] No user or role found, returning home path');
      return "/";
    }
    
    try {
      const role = user.role.toString().toLowerCase();
      let path = "/";
      
      switch (role) {
        case "pharmacist":
          path = "/pharmacist-dashboard";
          break;
        case "admin":
          path = "/admin";
          break;
        case "customer":
          path = "/customer/dashboard";
          break;
        default:
          console.warn(`[Auth Debug] Unknown role "${role}", using default path`);
      }

      console.log('[Auth Debug] Resolved dashboard path:', {
        role,
        path
      });
      
      return path;
    } catch (error) {
      console.error("[Auth Debug] Error getting dashboard path:", error);
      return "/";
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.patch("/auth/profile/", profileData);
      setUser(response.data);
      return { success: true, user: response.data };
    } catch (error) {
      console.error("Profile update failed:", error);
      return { success: false, error: error.response?.data || "Update failed" };
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    updateProfile,
    getDashboardPath,
    isAuthenticated: !!token && !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };
