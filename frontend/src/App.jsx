/**
 * Transcounty Pharmacy Aggregator - Main App Component
 * Copyright (c) 2024 Transcounty Pharmacy Aggregator
 * Author: Stephen Mleghwa Mwaniki
 * Created: Oct 10th 2025
 * License: MIT
 */

import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import Home from "./pages/Home";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import AddPrescription from "./pages/AddPrescription";
import ValidatePrescription from "./pages/ValidatePrescription";
import DispensePrescription from "./pages/DispensePrescription";
import InventoryManagement from "./pages/InventoryManagement";
import ReportsDashboard from "./pages/ReportsDashboard";

import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import UserAccount from "./pages/UserAccount";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <AuthProvider>
      <CartProvider>
        <div className="App">
          {!isAuthPage && <Navbar />}
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />

              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/account" element={<UserAccount />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route
                path="/pharmacist-dashboard"
                element={<PharmacistDashboard />}
              />
              <Route path="/prescriptions/add" element={<AddPrescription />} />
              <Route
                path="/prescriptions/:id/validate"
                element={<ValidatePrescription />}
              />
              <Route
                path="/prescriptions/:id/dispense"
                element={<DispensePrescription />}
              />
              <Route path="/inventory" element={<InventoryManagement />} />
              <Route path="/reports" element={<ReportsDashboard />} />
            </Routes>
          </main>
          {!isAuthPage && <Footer />}
        </div>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
