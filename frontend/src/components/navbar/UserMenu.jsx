import React from "react";
import { Link } from "react-router-dom";

const UserMenu = ({ user, handleLogout }) => {
    if (!user) {
        return (
            <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
                Sign in
            </Link>
        );
    }

    const dashboardPath = user.role === "admin" ? "/admin/dashboard" : "/pharmacist/dashboard";

    return (
        <div className="flex items-center gap-2">
            {(user.role === "admin" || user.role === "pharmacist") && (
                <Link
                    to={dashboardPath}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 border border-primary-100 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Dashboard
                </Link>
            )}

            <Link
                to="/account"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-primary-600 hover:bg-primary-50 border border-slate-100 hover:border-primary-100 transition-all"
            >
                <div className="relative">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                        {user.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-secondary-400 rounded-full border border-white" />
                </div>
                <span className="max-w-[80px] truncate">{user.username}</span>
            </Link>

            <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
            </button>
        </div>
    );
};

export default UserMenu;
