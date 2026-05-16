import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import {
  SunIcon, MoonIcon, ArrowRightOnRectangleIcon, ChevronLeftIcon, ChevronRightIcon,
  HomeIcon, ShoppingBagIcon, ChartBarIcon, ClipboardDocumentListIcon, Squares2X2Icon,
  ShieldCheckIcon, DocumentTextIcon, DocumentDuplicateIcon
} from "@heroicons/react/24/outline";

const getDashboardHref = (role) => {
  switch (role) {
    case 'admin':      return '/admin/dashboard';
    case 'pharmacist': return '/pharmacist/dashboard';
    case 'cashier':    return '/cashier/dashboard';
    case 'customer':   return '/customer/dashboard';
    default:           return '/account';
  }
};

const getNavLinks = (user) => {
  const base = [
    { to: "/",        label: "Home",    icon: HomeIcon },
    { to: "/products",label: "Store",   icon: ShoppingBagIcon },
  ];
  if (user) {
    base.splice(1, 0, { to: getDashboardHref(user.role), label: "Dashboard", icon: Squares2X2Icon });
  }
  if (user?.role === "admin" || user?.role === "pharmacist") {
    base.push(
      { to: "/inventory",       label: "Inventory", icon: ClipboardDocumentListIcon },
      { to: "/otc-sales",       label: "OTC Sales", icon: ShoppingBagIcon },
      { to: "/reports",         label: "Reports",   icon: ChartBarIcon },
      { to: "/documents",       label: "Documents", icon: DocumentTextIcon },
      { to: "/licensing",       label: "Licensing", icon: ShieldCheckIcon },
      { to: "/dispensing-logs", label: "Logs",      icon: DocumentDuplicateIcon }
    );
  } else if (user?.role === "cashier") {
    base.push({ to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon });
  } else if (user?.role === "auditor") {
    base.push(
      { to: "/inventory", label: "Inventory", icon: ClipboardDocumentListIcon },
      { to: "/reports",   label: "Reports",   icon: ChartBarIcon }
    );
  }
  return base;
};

const Sidebar = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { effectiveTheme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const links = getNavLinks(user ?? null);

  const onLogoutClick = () => {
    if (logout) logout();
    else navigate('/login');
  };

  return (
    <div
      className={`hidden md:flex md:flex-col ${isCollapsed ? 'w-20' : 'w-64'} h-full nav-premium border-r z-40 transition-all duration-300 flex-shrink-0 relative overflow-visible`}
      style={{ borderColor: 'var(--border-primary)', boxShadow: '4px 0 24px rgba(124,58,237,0.08)' }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 btn-primary rounded-full p-1 shadow-lg z-50 flex items-center justify-center"
        style={{ width: 24, height: 24 }}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed
          ? <ChevronRightIcon className="w-3.5 h-3.5 text-white" />
          : <ChevronLeftIcon  className="w-3.5 h-3.5 text-white" />
        }
      </button>

      {/* Ambient top glow */}
      <div
        className="absolute top-0 right-0 w-full h-32 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(124,58,237,0.08), transparent)' }}
      />

      {/* Brand / Logo */}
      <div
        className="p-6 pb-8 sticky top-0 z-10 flex flex-col items-center justify-center gap-3"
        style={{ borderBottom: '1px solid var(--border-primary)' }}
      >
        <Link
          to="/"
          className="flex flex-col items-center gap-2 group focus:outline-none focus-visible:ring-2 rounded-xl"
          style={{ '--tw-ring-color': 'var(--color-primary)' }}
        >
          <div
            className={`${isCollapsed ? 'w-10 h-10' : 'w-14 h-14'} nav-logo-mark flex items-center justify-center text-white font-bold text-lg group-hover:scale-105 transition-all duration-300`}
          >
            TP
          </div>
          {!isCollapsed && (
            <span
              className="nav-brand-text font-bold text-lg tracking-tight group-hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              Transcounty
            </span>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1.5">
        {links.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              title={isCollapsed ? label : ""}
              className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'} rounded-xl text-sm font-semibold transition-all duration-200 group`}
              style={
                active
                  ? {
                      color: '#ffffff',
                      background: 'var(--btn-gradient)',
                      boxShadow: '0 4px 14px rgba(124,58,237,0.25)',
                    }
                  : {
                      color: 'var(--text-primary)',
                      background: 'transparent',
                      border: '1px solid transparent',
                    }
              }
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--bg-field)';
                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                  e.currentTarget.style.color = 'var(--color-highlight)';
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'} ${!isCollapsed ? 'mr-3' : ''}`}
              />
              {!isCollapsed && <span className="truncate whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Footer — user actions */}
      <div
        className="p-4 sticky bottom-0 z-10"
        style={{
          borderTop: '1px solid var(--border-primary)',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(18px)',
        }}
      >
        {/* Theme + Logout row */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2' : 'justify-between gap-2'} mb-3`}>
          <button
            onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
            className="form-cancel-btn flex items-center justify-center flex-1 py-2"
            aria-label="Toggle Dark Mode"
            title="Toggle Theme"
          >
            {effectiveTheme === 'dark'
              ? <SunIcon  className="w-5 h-5" />
              : <MoonIcon className="w-5 h-5" />
            }
          </button>
          <button
            onClick={onLogoutClick}
            className="nav-logout-btn flex items-center justify-center flex-1 py-2"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        {user ? (
          <Link
            to="/account"
            title={isCollapsed ? "Manage Account" : ""}
            className={`data-cell flex items-center gap-3 ${isCollapsed ? 'p-2 justify-center' : 'p-3'} rounded-xl transition-all group`}
          >
            <div className="nav-avatar w-8 h-8 flex-shrink-0">
              {user.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {user.username}
                </p>
                <p className="text-[10px] font-semibold truncate uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                  {user.role}
                </p>
              </div>
            )}
          </Link>
        ) : (
          <Link to="/login" className="btn-primary nav-cta-btn flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm">
            {isCollapsed ? "→" : "Sign In"}
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
