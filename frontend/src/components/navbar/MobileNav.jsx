import React from "react";
import { Link } from "react-router-dom";
import { UserIcon } from "@heroicons/react/24/outline";

const MobileNav = ({ isOpen, user, handleLogout }) => {
    return (
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

                {user && (
                    <>
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
                    </>
                )}

                {user ? (
                    <>
                        {/* Dashboard Link in Mobile Menu - Redundant if already shown above, but keeping for consistency with original if needed. 
                Actually, the original had a logic check. Let's keep it clean. 
                The block above handles the dashboard link. 
            */}

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
    );
};

export default MobileNav;
