import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
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
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api", // Backend API base URL
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
      const response = await api.post("/auth/login/", credentials);
      const { access, user: userData } = response.data;
      setToken(access);
      localStorage.setItem("access_token", access);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: error.response?.data || "Login failed" };
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
    setToken(null);
    setUser(null);
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  const getDashboardPath = () => {
    if (!user) return "/";
    switch (user.role) {
      case "pharmacist":
        return "/pharmacist-dashboard";
      case "admin":
        return "/admin";
      default:
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
