import React from "react";
import { Link } from "react-router-dom";

const MobileNav = ({ isOpen, user, handleLogout }) => {
    if (!isOpen) return null;

    const mobileLink = "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-700 hover:text-primary-600 hover:bg-primary-50 transition-all";

    return (
        <div className="md:hidden border-t border-white/60 bg-white/95 backdrop-blur-xl" id="mobile-menu">
            <div className="px-3 py-3 space-y-1">
                {user && (
                    <>
                        {(user.role === "admin" || user.role === "pharmacist" || user.role === "cashier") && (
                            <Link
                                to={
                                    user.role === "admin" ? "/admin/dashboard" :
                                        user.role === "pharmacist" ? "/pharmacist/dashboard" :
                                            "/cashier/dashboard"
                                }
                                className={`${mobileLink} bg-primary-50 text-primary-600 font-semibold`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                {
                                    user.role === "admin" ? "Admin Dashboard" :
                                        user.role === "pharmacist" ? "Pharmacy Dashboard" :
                                            "Cashier Terminal"
                                }
                            </Link>
                        )}

                        {(user.role === "admin" || user.role === "pharmacist" || user.role === "auditor") && (
                            <>
                                <Link to="/inventory" className={mobileLink}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    Inventory
                                </Link>
                                <Link to="/reports" className={mobileLink}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Reports
                                </Link>
                                <Link to="/licensing" className={mobileLink}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Licensing
                                </Link>
                                {(user.role === "admin" || user.role === "pharmacist") && (
                                    <Link to="/dispensing-logs" className={mobileLink}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                        Dispensing Logs
                                    </Link>
                                )}
                            </>
                        )}

                        <div className="border-t border-slate-100 my-2" />

                        <Link to="/account" className={mobileLink}>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                                {user.username?.[0]?.toUpperCase()}
                            </div>
                            {user.username}
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                    </>
                )}

                {!user && (
                    <Link
                        to="/login"
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                        style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                    >
                        Sign in
                    </Link>
                )}
            </div>
        </div>
    );
};

export default MobileNav;
