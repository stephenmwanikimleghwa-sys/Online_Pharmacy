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
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Fetch user profile
      axios
        .get(`${API_BASE_URL}/auth/profile/`)
        .then((response) => setUser(response.data))
        .catch(() => {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
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
  const { access, refresh } = response.data;
  localStorage.setItem("access_token", access);
  if (refresh) localStorage.setItem("refresh_token", refresh);
  setToken(access);
  axios.defaults.headers.common["Authorization"] = `Bearer ${access}`;
      const profileResponse = await axios.get("/api/auth/profile/");
      setUser(profileResponse.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data || "Login failed" };
    }
  };

  // Registration disabled on client side. Server registration endpoints removed.

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  const getDashboardPath = () => {
    if (!user) return "/";
    switch (user.role) {
      case "pharmacist":
        return "/pharmacist/dashboard";
      case "admin":
        return "/admin/dashboard";
      default:
        return "/";
    }
  };

  const value = {
    user,
    token,
    login,
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
