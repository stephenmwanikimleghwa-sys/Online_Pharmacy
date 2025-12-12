import React from "react";
import { Link } from "react-router-dom";
import { UserIcon } from "@heroicons/react/24/outline";

const UserMenu = ({ user, handleLogout }) => {
    if (!user) {
        return (
            <Link
                to="/login"
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
            >
                Login
            </Link>
        );
    }

    return (
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
    );
};

export default UserMenu;
