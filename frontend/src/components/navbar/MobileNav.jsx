import React from "react";
import { Link } from "react-router-dom";
import {
  HomeIcon,
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  ShoppingBagIcon,
  UsersIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const MobileNav = ({ isOpen, user, handleLogout, onClose }) => {
  if (!isOpen) return null;

  const linkBase =
    "flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200";

  const getDashboardHref = (role) => {
    if (role === "admin") return "/admin/dashboard";
    if (role === "pharmacist") return "/branch/dashboard";
    if (role === "cashier") return "/cashier/dashboard";
    return "/account";
  };

  const getUserManagementHref = (u) => {
    if (u?.role === "admin") return "/admin/users";
    if (u?.role === "pharmacist" || u?.role === "cashier") return "/customers";
    return "/account";
  };

  return (
    <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-label="Mobile menu">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-700">
          <p className="font-bold text-sm">Navigation</p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="px-3 py-4 space-y-1">
          {user ? (
            <>
              <Link to="/" onClick={onClose} className={`${linkBase} mobile-nav-link`}>
                <HomeIcon className="h-5 w-5" /> Home
              </Link>
              <Link to={getDashboardHref(user.role)} onClick={onClose} className={`${linkBase} mobile-nav-link`}>
                <Squares2X2Icon className="h-5 w-5" /> Dashboard
              </Link>
              <Link to="/inventory" onClick={onClose} className={`${linkBase} mobile-nav-link`}>
                <ClipboardDocumentListIcon className="h-5 w-5" /> Inventory
              </Link>
              <Link to="/otc-sales" onClick={onClose} className={`${linkBase} mobile-nav-link`}>
                <ShoppingBagIcon className="h-5 w-5" /> OTC Sale
              </Link>
              <Link to={getUserManagementHref(user)} onClick={onClose} className={`${linkBase} mobile-nav-link`}>
                <UsersIcon className="h-5 w-5" /> User Management
              </Link>
              <Link to="/account" onClick={onClose} className={`${linkBase} mobile-nav-link`}>
                <UserCircleIcon className="h-5 w-5" /> Profile
              </Link>

              <div className="border-t border-neutral-200/80 my-3" />
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  onClose?.();
                }}
                className={`${linkBase} w-full text-left text-red-600 hover:bg-red-50 hover:text-red-700`}
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" onClick={onClose} className="nav-cta-btn flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold">
              Sign in
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
};

export default MobileNav;
