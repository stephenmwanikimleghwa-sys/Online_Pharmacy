import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Backend API base URL (must be set in env)
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

  // Configure axios defaults
  const api = axios.create({
    baseURL: API_BASE_URL,
  });

  // Add auth token to requests
  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Check if token is valid on app load
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await api.get("/auth/profile");
          setUser(response.data);
        } catch (error) {
          console.error("Token verification failed:", error);
          logout();
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, [token]);

  const login = async (credentials) => {
    try {
      // Include role in login request
      const response = await api.post("/auth/login/", {
        username: credentials.username,
        password: credentials.password,
        role: credentials.role
      });
      const { access, user: userData } = response.data;
      
      // Verify role matches requested role
      if (userData.role !== credentials.role) {
        throw new Error(`Invalid role. You are not registered as a ${credentials.role}.`);
      }
      
      setToken(access);
      localStorage.setItem("access_token", access);
      localStorage.setItem("user_role", userData.role);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error("Login failed:", error);
      const errorMessage = error.message || error.response?.data?.detail || "Login failed";
      return { success: false, error: { detail: errorMessage } };
    }
  };

  const register = async (formData) => {
    try {
      const response = await api.post("/auth/register/", formData);
      const { access, user: userData } = response.data;
      setToken(access);
      localStorage.setItem("access_token", access);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error("Registration failed:", error);
      return {
        success: false,
        error: error.response?.data || "Registration failed",
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
