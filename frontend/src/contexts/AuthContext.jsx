import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Fetch user profile
      axios
        .get(`${API_BASE_URL}/auth/profile/`)
        .then((response) => setUser(response.data))
        .catch(() => {
          localStorage.removeItem("token");
          setToken(null);
        });
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login/`, {
        username,
        password,
      });
      const { access } = response.data;
      localStorage.setItem("token", access);
      setToken(access);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;
      const profileResponse = await axios.get("/api/auth/profile/");
      setUser(profileResponse.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data || "Login failed" };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post("/api/auth/register/", userData);
      const { access } = response.data;
      localStorage.setItem("token", access);
      setToken(access);
      axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;
      const profileResponse = await axios.get("/api/auth/profile/");
      setUser(profileResponse.data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || "Registration failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  const getDashboardPath = () => {
    if (!user) return "/";
    switch (user.role) {
      case "pharmacist":
        return "/pharmacist-dashboard";
      case "admin":
        return "/admin-dashboard";
      default:
        return "/";
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    getDashboardPath,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
