import React from "react";
import { Link } from "react-router-dom";

const MobileNav = ({ isOpen, user, handleLogout }) => {
  if (!isOpen) return null;

  const linkBase =
    "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200";

  return (
    <div
      className="mobile-nav-panel md:hidden"
      id="mobile-menu"
      role="dialog"
      aria-label="Mobile menu"
    >
      <div className="px-3 py-4 space-y-1">
        {user && (
          <>
            {(user.role === "admin" || user.role === "pharmacist" || user.role === "cashier") && (
              <Link
                to={
                  user.role === "admin"
                    ? "/admin/dashboard"
                    : user.role === "pharmacist"
                      ? "/pharmacist/dashboard"
                      : "/cashier/dashboard"
                }
                className={`${linkBase} mobile-nav-cta`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                {user.role === "admin"
                  ? "Admin Dashboard"
                  : user.role === "pharmacist"
                    ? "Pharmacy Dashboard"
                    : "Cashier Terminal"}
              </Link>
            )}

            <Link to="/" className={`${linkBase} mobile-nav-link`}>Home</Link>
            <Link to="/products" className={`${linkBase} mobile-nav-link`}>Products</Link>

            {(user.role === "admin" || user.role === "pharmacist" || user.role === "auditor" || user.role === "cashier") && (
              <>
                {(user.role !== "auditor") && (
                  <Link to="/otc-sales" className={`${linkBase} mobile-nav-link`}>OTC Sales</Link>
                )}
                {(user.role !== "cashier") && (
                  <Link to="/inventory" className={`${linkBase} mobile-nav-link`}>Inventory</Link>
                )}
                <Link to="/reports" className={`${linkBase} mobile-nav-link`}>Reports</Link>
                {(user.role === "admin" || user.role === "pharmacist") && (
                  <>
                    <Link to="/licensing" className={`${linkBase} mobile-nav-link`}>Licensing</Link>
                    <Link to="/dispensing-logs" className={`${linkBase} mobile-nav-link`}>Dispensing Logs</Link>
                  </>
                )}
              </>
            )}

            <div className="border-t border-neutral-200/80 my-3" />

            <Link to="/account" className={`${linkBase} mobile-nav-link`}>
              <div className="nav-avatar flex-shrink-0" aria-hidden>
                {user.username?.[0]?.toUpperCase() ?? "?"}
              </div>
              {user.username}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className={`${linkBase} w-full text-left text-red-600 hover:bg-red-50 hover:text-red-700`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </>
        )}

        {!user && (
          <Link to="/login" className="nav-cta-btn flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
};

export default MobileNav;
