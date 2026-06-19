/**
 * Transcounty Pharmacy Aggregator - Main App Component
 * Copyright (c) 2024 Transcounty Pharmacy Aggregator
 * Author: Stephen Mleghwa Mwaniki
 * Created: Oct 10th 2025
 * License: MIT
 */

import React, { useEffect, Suspense, lazy } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CartProvider } from "./context/CartContext";
import { NotificationProvider } from "./context/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import PageLoader from "./components/PageLoader";

const PharmacistDashboard = lazy(() => import("./pages/PharmacistDashboard"));
const RestockRequests = lazy(() => import("./pages/RestockRequests"));
const AddPrescription = lazy(() => import("./pages/AddPrescription"));
const ValidatePrescription = lazy(() => import("./pages/ValidatePrescription"));
const DispensePrescription = lazy(() => import("./pages/DispensePrescription"));
const InventoryManagement = lazy(() => import("./pages/InventoryManagement"));
const ReportsDashboard = lazy(() => import("./pages/ReportsDashboard"));
const DispensingLogsPage = lazy(() => import("./pages/DispensingLogsPage"));
const PharmacyLicensing = lazy(() => import("./pages/PharmacyLicensing"));
const CashierDashboard = lazy(() => import("./pages/CashierDashboard"));
const ForcePasswordChange = lazy(() => import("./pages/ForcePasswordChange"));

const Products = lazy(() => import("./pages/Products"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const UserAccount = lazy(() => import("./pages/UserAccount"));
const PasswordResetRequest = lazy(() => import("./pages/PasswordResetRequest"));
const PasswordResetConfirm = lazy(() => import("./pages/PasswordResetConfirm"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminStock = lazy(() => import("./pages/AdminStock"));
const BranchesOverview = lazy(() => import("./pages/BranchesOverview"));
const BranchSelectionScreen = lazy(() => import("./pages/BranchSelectionScreen"));
const StockIntakeLog = lazy(() => import("./pages/StockIntakeLog"));
const OTCSales = lazy(() => import("./pages/OTCSales"));
const Customers = lazy(() => import("./pages/Customers"));
const DocumentRegistry = lazy(() => import("./pages/DocumentRegistry"));
const ManageUsers = lazy(() => import("./pages/ManageUsers"));
const FinancialDashboard = lazy(() => import("./pages/finance/FinancialDashboard"));
const QuotationsDashboard = lazy(() => import("./pages/finance/QuotationsDashboard"));
const ClinicalDashboard = lazy(() => import('./pages/clinical/ClinicalDashboard'));
const ConsultationWorkflow = lazy(() => import('./pages/clinical/ConsultationWorkflow'));
const ReturnsDashboard = lazy(() => import('./pages/inventory/ReturnsDashboard'));
import BottomNav from "./components/BottomNav";
import Sidebar from "./components/navbar/Sidebar";
import ScrollToTop from "./components/ScrollToTop";
import "./App.css";

import ErrorBoundary from "./components/ErrorBoundary";

/**
 * AppLayout — consumes context hooks (must be rendered *inside* the providers).
 * Decides whether to show the sidebar/navbar chrome based on route + auth state.
 */
function AppLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Keep-alive ping to prevent Render free tier from sleeping
    const pingInterval = setInterval(() => {
      // The health endpoint path is /api/health/ as configured in backend urls.py
      fetch('/api/health/').catch(() => {});
    }, 14 * 60 * 1000);
    
    return () => clearInterval(pingInterval);
  }, []);

  const isAuthPage = ["/login", "/force-password-change", "/branch/select"].includes(location.pathname);
  // Hide full sidebar/navbar chrome on the public home page when not logged in
  const isUnauthHome = location.pathname === "/" && !isAuthenticated;
  const showChrome = !isAuthPage && !isUnauthHome;
  const showFooter = location.pathname === "/";

  return (
    <>
      <ScrollToTop />
      <div className="flex h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--bg-gradient)', backgroundAttachment: 'fixed' }}>
        {showChrome && <Sidebar />}

        <div data-scroll-root className="flex-1 flex flex-col w-full min-w-0 h-full overflow-y-auto overflow-x-hidden relative pb-16 md:pb-0">
          {showChrome && <Navbar />}

          <main key={location.pathname} className="main-content page-enter flex-auto flex-shrink-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/password-reset" element={<PasswordResetRequest />} />
                  <Route path="/password-reset-confirm/:uid/:token" element={<PasswordResetConfirm />} />
                  <Route path="/force-password-change" element={<ProtectedRoute element={ForcePasswordChange} />} />
                  <Route
                    path="/branch/select"
                    element={<ProtectedRoute element={BranchSelectionScreen} allowedRoles={["admin"]} />}
                  />

                  {/* Protected Routes */}
                  <Route path="/products" element={<ProtectedRoute element={Products} />} />
                  <Route path="/products/:id" element={<ProtectedRoute element={ProductDetails} />} />
                  <Route path="/financials" element={<ProtectedRoute element={FinancialDashboard} allowFinancials={true} />} />
                  <Route path="/quotations" element={<ProtectedRoute element={QuotationsDashboard} />} />
                  <Route path="/clinical" element={<ProtectedRoute element={ClinicalDashboard} allowedRoles={['admin', 'pharmacist']} />} />
                  <Route path="/clinical/:id" element={<ProtectedRoute element={ConsultationWorkflow} allowedRoles={['admin', 'pharmacist']} />} />
                  <Route path="/returns" element={<ProtectedRoute element={ReturnsDashboard} allowedRoles={['admin', 'pharmacist']} />} />
                  <Route path="/users" element={<ProtectedRoute element={ManageUsers} allowedRoles={['admin']} />} />

                  {/* Protected Customer Routes */}
                  <Route
                    path="/inventory/control"
                    element={<ProtectedRoute element={AdminStock} allowedRoles={["admin", "pharmacist", "cashier"]} requiresActiveBranch />}
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
                    element={<Navigate to="/branch/dashboard" replace />}
                  />
                  <Route
                    path="/branch/dashboard"
                    element={
                      <ProtectedRoute
                        element={PharmacistDashboard}
                        allowedRoles={['pharmacist']}
                        requiresActiveBranch
                      />
                    }
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
                    element={
                      <ProtectedRoute
                        element={DispensePrescription}
                        allowedRoles={['pharmacist', 'admin']}
                        requiresActiveBranch
                      />
                    }
                  />
                  <Route
                    path="/inventory/management"
                    element={
                      <ProtectedRoute 
                        element={InventoryManagement} 
                        allowedRoles={['admin', 'auditor']}
                        deniedTitle="Access Denied"
                        deniedMessage="Access Denied — Inventory Management is only available to administrators. You can manage your branch inventory in Inventory Control."
                      />
                    }
                  />
                  <Route
                    path="/stock-intake"
                    element={
                      <ProtectedRoute
                        element={StockIntakeLog}
                        allowedRoles={['pharmacist', 'admin']}
                        requiresActiveBranch
                      />
                    }
                  />

                  {/* Protected Admin Routes */}
                  <Route
                    path="/admin/dashboard"
                    element={<ProtectedRoute element={AdminDashboard} allowedRoles={['admin']} />}
                  />
                  <Route
                    path="/admin/branches"
                    element={<ProtectedRoute element={BranchesOverview} allowedRoles={['admin']} />}
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
                    element={<ProtectedRoute element={ReportsDashboard} allowedRoles={['admin', 'pharmacist', 'auditor', 'cashier']} />}
                  />
                  <Route
                    path="/documents"
                    element={<ProtectedRoute element={DocumentRegistry} allowedRoles={['admin', 'pharmacist']} />}
                  />
                  <Route
                    path="/otc-sales"
                    element={
                      <ProtectedRoute
                        element={OTCSales}
                        allowedRoles={['admin', 'pharmacist', 'cashier']}
                        requiresActiveBranch
                      />
                    }
                  />
                  <Route
                    path="/customers"
                    element={<ProtectedRoute element={Customers} allowedRoles={['admin', 'pharmacist', 'cashier']} />}
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
              </Suspense>
            </ErrorBoundary>
          </main>
          {showChrome && showFooter && <Footer />}
        </div>
        {showChrome && <BottomNav />}
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            <AppLayout />
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
