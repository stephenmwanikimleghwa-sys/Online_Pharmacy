import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import {
  ShoppingCartIcon,
  UserIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";

const Navbar = () => {
  const { user, logout, loading } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  // Close mobile menu on navigation
  React.useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-lg backdrop-blur-md bg-white/90 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center transform group-hover:rotate-3 transition-all duration-300">
                <span className="text-white font-bold text-sm">TP</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Transcounty Pharmacy
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className="group flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>

            <Link
              to="/products"
              className="group flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-1.5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Products
            </Link>
            <Link
              to="/cart"
              className="group flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium relative transition-all duration-200"
            >
              <div className="relative">
                <ShoppingCartIcon className="h-5 w-5 mr-1.5 group-hover:scale-110 transition-transform duration-200" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-br from-blue-600 to-blue-800 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {totalItems}
                  </span>
                )}
              </div>
              Cart
            </Link>
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {/* Dashboard Links */}
                {(user.role === "admin" || user.role === "pharmacist") && (
                  <>
                    <Link
                      to={user.role === "admin" ? "/admin/dashboard" : "/pharmacist/dashboard"}
                      className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-100 group"
                    >
                      <svg className="w-5 h-5 mr-2 text-blue-600 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span>{user.role === "admin" ? "Admin Dashboard" : "Pharmacy Dashboard"}</span>
                    </Link>
                    <Link
                      to="/dispensing-logs"
                      className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-100 group"
                    >
                      <svg className="w-5 h-5 mr-2 text-blue-600 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span>Dispensing Logs</span>
                    </Link>
                  </>
                )}

                {/* User Profile Link */}
                <Link
                  to="/account"
                  className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-medium bg-gray-50 hover:bg-blue-50 transition-all duration-200 border border-gray-100 hover:border-blue-100"
                >
                  <div className="relative">
                    <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                    <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-400 rounded-full"></span>
                  </div>
                  <span>{user.username}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center text-gray-700 hover:text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-all duration-200 border border-transparent hover:border-red-100 group"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-primary p-2"
              aria-label="Toggle menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'} transition-all duration-200 ease-in-out`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
          {user && (user.role === "admin" || user.role === "pharmacist") && (
            <Link
              to={user.role === "admin" ? "/admin/dashboard" : "/pharmacist/dashboard"}
              className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium bg-blue-50/50 group"
            >
              <svg className="w-5 h-5 mr-2 text-blue-600 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              {user.role === "admin" ? "Admin Dashboard" : "Pharmacy Dashboard"}
            </Link>
          )}

          <Link
            to="/"
            className="flex items-center text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-base font-medium group"
          >
            <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </Link>

          <Link
            to="/products"
            className="text-gray-700 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
          >
            Products
          </Link>
          <Link
            to="/cart"
            className="text-gray-700 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
          >
            Cart ({totalItems})
          </Link>
          {user ? (
            <>
              {/* Dashboard Link in Mobile Menu */}
              {(user.role === "admin" || user.role === "pharmacist") && (
                <Link
                  to={user.role === "admin" ? "/admin/dashboard" : "/pharmacist/dashboard"}
                  className="flex items-center text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium bg-blue-50"
                >
                  <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span>{user.role === "admin" ? "Admin Dashboard" : "Pharmacy Dashboard"}</span>
                </Link>
              )}
              
              <Link
                to="/account"
                className="flex items-center text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
              >
                <UserIcon className="h-5 w-5 mr-2" />
                Account
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-700 hover:text-red-600 block px-3 py-2 rounded-md text-base font-medium w-full"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-gray-700 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
              >
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
