// /**
//  * Transcounty Pharmacy Aggregator - Main App Component
//  * Copyright (c) 2024 Transcounty Pharmacy Aggregator
//  * Author: Stephen Mleghwa Mwaniki
//  * Created: Oct 10th 2025
//  * License: MIT
//  */
// 
// import React from "react";
// import { Routes, Route, useLocation, Navigate } from "react-router-dom";
// import { AuthProvider } from "./context/AuthContext";
// import { CartProvider } from "./context/CartContext";
// import ProtectedRoute from "./components/ProtectedRoute";
// import Home from "./pages/Home";
// import PharmacistDashboard from "./pages/PharmacistDashboard";
// import AddPrescription from "./pages/AddPrescription";
// import ValidatePrescription from "./pages/ValidatePrescription";
// import DispensePrescription from "./pages/DispensePrescription";
// import InventoryManagement from "./pages/InventoryManagement";
// import ReportsDashboard from "./pages/ReportsDashboard";
// 
// import Products from "./pages/Products";
// import ProductDetails from "./pages/ProductDetails";
// import Cart from "./pages/Cart";
// import Checkout from "./pages/Checkout";
// import UserAccount from "./pages/UserAccount";
// import Login from "./pages/Login";
// import AdminDashboard from "./pages/AdminDashboard";
// import Navbar from "./components/Navbar";
// import Footer from "./components/Footer";
// import ManageUsers from "./pages/ManageUsers";
// import "./App.css";
// 
// function App() {
//   const location = useLocation();
//   // Only the login page is considered the auth page now — registration has been disabled.
//   const isAuthPage = location.pathname === "/login";
// 
//   return (
//     <AuthProvider>
//       <CartProvider>
//         <div className="App">
//           {!isAuthPage && <Navbar />}
//           <main className="main-content">
//             <Routes>
//               {/* Public Routes */}
//               <Route path="/" element={<Home />} />
//               <Route path="/products" element={<Products />} />
//               <Route path="/products/:id" element={<ProductDetails />} />
//               <Route path="/login" element={<Login />} />
//               
//               {/* Protected Customer Routes */}
//               <Route
//                 path="/cart"
//                 element={<ProtectedRoute element={Cart} allowedRoles={['customer']} />}
//               />
//               <Route
//                 path="/checkout"
//                 element={<ProtectedRoute element={Checkout} allowedRoles={['customer']} />}
//               />
//               <Route
//                 path="/customer/dashboard"
//                 element={<ProtectedRoute element={UserAccount} allowedRoles={['customer']} />}
//               />
//               <Route
//                 path="/account"
//                 element={<ProtectedRoute element={UserAccount} />}
//               />
// 
//               {/* Protected Pharmacist Routes */}
//               <Route
//                 path="/pharmacist/dashboard"
//                 element={<ProtectedRoute element={PharmacistDashboard} allowedRoles={['pharmacist']} />}
//               />
//               <Route
//                 path="/prescriptions/add"
//                 element={<ProtectedRoute element={AddPrescription} allowedRoles={['pharmacist']} />}
//               />
//               <Route
//                 path="/prescriptions/:id/validate"
//                 element={<ProtectedRoute element={ValidatePrescription} allowedRoles={['pharmacist']} />}
//               />
//               <Route
//                 path="/prescriptions/:id/dispense"
//                 element={<ProtectedRoute element={DispensePrescription} allowedRoles={['pharmacist']} />}
//               />
//               <Route
//                 path="/inventory"
//                 element={<ProtectedRoute element={InventoryManagement} allowedRoles={['pharmacist', 'admin']} />}
//               />
// 
//               {/* Protected Admin Routes */}
//               <Route
//                 path="/admin/dashboard"
//                 element={<ProtectedRoute element={AdminDashboard} allowedRoles={['admin']} />}
//               />
//               <Route
//                 path="/admin/users"
//                 element={<ProtectedRoute element={ManageUsers} allowedRoles={['admin']} />}
//               />
//               <Route
//                 path="/reports"
//                 element={<ProtectedRoute element={ReportsDashboard} allowedRoles={['admin', 'pharmacist']} />}
//               />
// 
//               {/* Catch-all redirect */}
//               <Route path="*" element={<Navigate to="/" replace />} />
//             </Routes>
//           </main>
//           {!isAuthPage && <Footer />}
//         </div>
//       </CartProvider>
//     </AuthProvider>
//   );
// }
// 
// export default App;
