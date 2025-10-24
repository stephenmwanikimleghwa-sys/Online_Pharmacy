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

      // store token if present
      if (access) {
        setToken(access);
        localStorage.setItem("access_token", access);
      }

      // If user data is present, set it. If not, attempt to fetch profile
      let finalUser = null;
      if (userData && typeof userData === "object") {
        finalUser = userData;
      } else {
        // Try to fetch the profile using the token we just stored so we can
        // reliably determine the user's role and other attributes.
        try {
          const profileRes = await api.get("/auth/profile");
          finalUser = profileRes.data?.user || profileRes.data?.profile || profileRes.data || null;
        } catch (profileErr) {
          console.warn("Failed to fetch profile after login:", profileErr);
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
    if (!user || !user.role) return "/";
    
    try {
      switch (user.role) {
        case "pharmacist":
          return "/pharmacist-dashboard";
        case "admin":
          return "/admin";
        case "customer":
          return "/customer/dashboard";
        default:
          return "/";
      }
    } catch (error) {
      console.error("Error getting dashboard path:", error);
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
