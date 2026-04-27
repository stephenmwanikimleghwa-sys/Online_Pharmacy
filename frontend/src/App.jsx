/**
 * Transcounty Pharmacy Aggregator - Main App Component
 * Copyright (c) 2024 Transcounty Pharmacy Aggregator
 * Author: Stephen Mleghwa Mwaniki
 * Created: Oct 10th 2025
 * License: MIT
 */

import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import PharmacistDashboard from "./pages/PharmacistDashboard";
import RestockRequests from "./pages/RestockRequests";
import AddPrescription from "./pages/AddPrescription";
import ValidatePrescription from "./pages/ValidatePrescription";
import DispensePrescription from "./pages/DispensePrescription";
import InventoryManagement from "./pages/InventoryManagement";
import ReportsDashboard from "./pages/ReportsDashboard";
import DispensingLogsPage from "./pages/DispensingLogsPage";
import PharmacyLicensing from "./pages/PharmacyLicensing";
import CashierDashboard from "./pages/CashierDashboard";
import ForcePasswordChange from "./pages/ForcePasswordChange";

import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import UserAccount from "./pages/UserAccount";
import Login from "./pages/Login";
import PasswordResetRequest from "./pages/PasswordResetRequest";
import PasswordResetConfirm from "./pages/PasswordResetConfirm";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStock from "./pages/AdminStock";
import StockIntakeLog from "./pages/StockIntakeLog";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ManageUsers from "./pages/ManageUsers";
import BottomNav from "./components/BottomNav";
import "./App.css";

import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  const location = useLocation();
  const isAuthPage = ["/login", "/force-password-change"].includes(location.pathname);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#171717',
              color: '#ffffff',
              border: '1px solid #e20074',
              borderRadius: '12px'
            },
            success: {
              iconTheme: { primary: '#00b3ff', secondary: '#000000' }
            },
            error: {
              iconTheme: { primary: '#e20074', secondary: '#ffffff' }
            }
          }}
        />
        <div className="App">
          {!isAuthPage && <Navbar />}
          <main className="main-content">
        <ErrorBoundary>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/password-reset" element={<PasswordResetRequest />} />
              <Route path="/password-reset-confirm/:uid/:token" element={<PasswordResetConfirm />} />
              <Route path="/force-password-change" element={<ProtectedRoute element={ForcePasswordChange} />} />

              {/* Protected Routes */}
              <Route path="/products" element={<ProtectedRoute element={Products} />} />
              <Route path="/products/:id" element={<ProtectedRoute element={ProductDetails} />} />

              {/* Protected Customer Routes */}
              <Route
                path="/admin/stock"
                element={<ProtectedRoute element={AdminStock} allowedRoles={["admin"]} />}
              />
              <Route
                path="/customer/dashboard"
                element={<ProtectedRoute element={UserAccount} allowedRoles={['customer']} />}
              />
              <Route
                path="/account"
                element={<ProtectedRoute element={UserAccount} />}
              />

              {/* Protected Pharmacist Routes */}
              <Route
                path="/pharmacist/dashboard"
                element={<ProtectedRoute element={PharmacistDashboard} allowedRoles={['pharmacist']} />}
              />
              <Route
                path="/prescriptions/add"
                element={<ProtectedRoute element={AddPrescription} allowedRoles={['pharmacist']} />}
              />
              <Route
                path="/prescriptions/:id/validate"
                element={<ProtectedRoute element={ValidatePrescription} allowedRoles={['pharmacist']} />}
              />
              <Route
                path="/prescriptions/:id/dispense"
                element={<ProtectedRoute element={DispensePrescription} allowedRoles={['pharmacist']} />}
              />
              <Route
                path="/inventory"
                element={<ProtectedRoute element={InventoryManagement} allowedRoles={['admin', 'pharmacist', 'auditor']} />}
              />
              <Route
                path="/stock-intake"
                element={<ProtectedRoute element={StockIntakeLog} allowedRoles={['pharmacist', 'admin']} />}
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={<ProtectedRoute element={AdminDashboard} allowedRoles={['admin']} />}
              />
              <Route
                path="/admin/users"
                element={<ProtectedRoute element={ManageUsers} allowedRoles={['admin']} />}
              />
              <Route
                path="/admin/restock-requests"
                element={<ProtectedRoute element={RestockRequests} allowedRoles={['admin', 'pharmacist']} />}
              />
              <Route
                path="/reports"
                element={<ProtectedRoute element={ReportsDashboard} allowedRoles={['admin', 'pharmacist', 'auditor']} />}
              />
              <Route
                path="/dispensing-logs"
                element={<ProtectedRoute element={DispensingLogsPage} allowedRoles={['admin', 'pharmacist']} />}
              />
              <Route
                path="/licensing"
                element={<ProtectedRoute element={PharmacyLicensing} allowedRoles={['admin', 'pharmacist']} />}
              />
              <Route
                path="/cashier/dashboard"
                element={<ProtectedRoute element={CashierDashboard} allowedRoles={['cashier']} />}
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
        {!isAuthPage && <Footer />}
        <BottomNav />
      </div>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
