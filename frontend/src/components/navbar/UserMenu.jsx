import React from "react";
import { Link } from "react-router-dom";

const UserMenu = ({ user, handleLogout }) => {
  if (!user) {
    return (
      <Link
        to="/login"
        className="nav-cta-btn"
        aria-label="Sign in"
      >
        Sign in
      </Link>
    );
  }

  const dashboardPath =
    user.role === "admin"
      ? "/admin/dashboard"
      : user.role === "pharmacist"
        ? "/pharmacist/dashboard"
        : user.role === "cashier"
          ? "/cashier/dashboard"
          : "/account";

  return (
    <div className="flex items-center gap-2">
      {(user.role === "admin" || user.role === "pharmacist" || user.role === "cashier") && (
        <Link to={dashboardPath} className="nav-secondary-btn">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Dashboard
        </Link>
      )}

      <Link
        to="/account"
        className="nav-account-btn"
        aria-label={`Account for ${user.username}`}
      >
        <div className="nav-avatar" aria-hidden>
          {user.username?.[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="max-w-[88px] truncate text-sm font-medium text-neutral-700">{user.username}</span>
      </Link>

      <button
        type="button"
        onClick={handleLogout}
        className="nav-logout-btn"
        aria-label="Log out"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>
    </div>
  );
};

export default UserMenu;
