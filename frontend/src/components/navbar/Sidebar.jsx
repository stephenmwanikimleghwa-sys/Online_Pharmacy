import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { usePrefetchOnHover } from "../../hooks/usePrefetchOnHover";
import { QUERY_KEYS } from "../../lib/queryKeys";
import { STALE_TIMES } from "../../lib/staleTimes";
import { unwrapList } from "../../utils/parseApiData";
import {
  SunIcon, MoonIcon, ArrowRightOnRectangleIcon, ChevronLeftIcon, ChevronRightIcon,
  HomeIcon, ShoppingBagIcon, ChartBarIcon, ClipboardDocumentListIcon, Squares2X2Icon,
  ShieldCheckIcon, DocumentTextIcon, DocumentDuplicateIcon, BuildingOffice2Icon,
  BanknotesIcon, DocumentPlusIcon, UserGroupIcon, ArrowUturnLeftIcon
} from "@heroicons/react/24/outline";
import BranchSelector from "../BranchSelector";

const getDashboardHref = (role) => {
  switch (role) {
    case 'admin':      return '/admin/dashboard';
    case 'pharmacist': return '/branch/dashboard';
    case 'cashier':    return '/cashier/dashboard';
    case 'customer':   return '/customer/dashboard';
    default:           return '/account';
  }
};

const getNavGroups = (user) => {
  const mainLinks = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/products", label: "Store", icon: ShoppingBagIcon },
  ];

  if (user) {
    mainLinks.splice(1, 0, { to: getDashboardHref(user.role), label: "Dashboard", icon: Squares2X2Icon });
  }

  const operationsLinks = [];
  const adminLinks = [];

  if (user?.role === "admin") {
    operationsLinks.push(
      { to: "/inventory/management", label: "Inventory Management", icon: ClipboardDocumentListIcon },
      { to: "/inventory/control", label: "Inventory Control", icon: ClipboardDocumentListIcon },
      { to: "/customers", label: "Customers", icon: UserGroupIcon },
      { to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon },
      { to: "/purchase-orders", label: "Purchase Orders", icon: DocumentPlusIcon },
      { to: "/reports", label: "Reports Panel", icon: ChartBarIcon },
      { to: "/quotations", label: "Quotations", icon: DocumentPlusIcon },
      { to: "/returns", label: "Returns", icon: ArrowUturnLeftIcon },
      { to: "/clinical", label: "Clinical Services", icon: UserGroupIcon },
      { to: "/documents", label: "Documents", icon: DocumentTextIcon },
      { to: "/licensing", label: "Licensing", icon: ShieldCheckIcon },
    );
    adminLinks.push(
      { to: "/admin/branches", label: "Branches Overview", icon: BuildingOffice2Icon },
      { to: "/admin/users", label: "User Management", icon: ShieldCheckIcon },
      { to: "/dispensing-logs", label: "Audit Logs", icon: DocumentDuplicateIcon },
    );
  } else if (user?.role === "pharmacist") {
    operationsLinks.push(
      { to: "/inventory/management", label: "Inventory Management", icon: ClipboardDocumentListIcon },
      { to: "/inventory/control", label: "Inventory Control", icon: ClipboardDocumentListIcon },
      { to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon },
      { to: "/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/quotations", label: "Quotations", icon: DocumentPlusIcon },
      { to: "/returns", label: "Returns", icon: ArrowUturnLeftIcon },
      { to: "/clinical", label: "Clinical Services", icon: UserGroupIcon },
      { to: "/documents", label: "Documents", icon: DocumentTextIcon },
      { to: "/licensing", label: "Licensing", icon: ShieldCheckIcon },
      { to: "/dispensing-logs", label: "Logs", icon: DocumentDuplicateIcon },
    );
  } else if (user?.role === "cashier") {
    operationsLinks.push({ to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon });
  } else if (user?.role === "auditor") {
    operationsLinks.push(
      { to: "/inventory/management", label: "Inventory Management", icon: ClipboardDocumentListIcon },
      { to: "/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/quotations", label: "Quotations", icon: DocumentPlusIcon },
    );
  }

  if (user?.can_view_financials || user?.role === "admin" || user?.role === "auditor") {
    operationsLinks.push({ to: "/financials", label: "Financials", icon: BanknotesIcon });
  }

  return { mainLinks, operationsLinks, adminLinks };
};

const Sidebar = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { effectiveTheme, setTheme } = useTheme();
  const { user, logout, activeBranch } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { mainLinks, operationsLinks, adminLinks } = getNavGroups(user ?? null);

  const inventoryPrefetch = usePrefetchOnHover(
    QUERY_KEYS.inventory(activeBranch?.id, { per_page: 50 }),
    async () => {
      const res = await api.get('/inventory/list/', { params: { per_page: 50 } });
      const data = res.data || {};
      return data.products || data.results || unwrapList(data);
    },
    STALE_TIMES.MEDIUM,
  );
  const suppliersPrefetch = usePrefetchOnHover(
    QUERY_KEYS.suppliers,
    () => api.get('/inventory/suppliers/').then((r) => r.data),
    STALE_TIMES.SLOW,
  );
  const customersPrefetch = usePrefetchOnHover(
    QUERY_KEYS.customers,
    async () => {
      const res = await api.get('/auth/customers/');
      return unwrapList(res.data);
    },
    STALE_TIMES.SLOW,
  );
  const reportsPrefetch = usePrefetchOnHover(
    QUERY_KEYS.dashboardGlobal,
    () => api.get('/dashboard/global-overview/').then((r) => r.data),
    STALE_TIMES.FAST,
  );
  const logsPrefetch = usePrefetchOnHover(
    QUERY_KEYS.dispensingLogs({}),
    async () => {
      const res = await api.get('/inventory/dispensations/', { params: {} });
      return unwrapList(res.data);
    },
    STALE_TIMES.MEDIUM,
  );
  const usersPrefetch = usePrefetchOnHover(
    QUERY_KEYS.users,
    async () => {
      const res = await api.get('/auth/admin/users/');
      return unwrapList(res.data);
    },
    STALE_TIMES.SLOW,
  );

  const getLinkPrefetch = (to) => {
    if (to.includes('/inventory/management') || to.includes('/inventory/control')) return inventoryPrefetch;
    if (to === '/customers') return customersPrefetch;
    if (to === '/reports' || to.includes('/reports')) return reportsPrefetch;
    if (to === '/dispensing-logs') return logsPrefetch;
    if (to === '/admin/users') return usersPrefetch;
    if (to.includes('supplier')) return suppliersPrefetch;
    return {};
  };
  const sections = [
    { title: "Main", links: mainLinks },
    { title: "Operations", links: operationsLinks },
    { title: "Admin", links: adminLinks },
  ].filter(section => section.links.length > 0);

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
        {/* Branch Selector — only for admin, only when expanded */}
        {!isCollapsed && (
          <div style={{ paddingTop: '8px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <BranchSelector />
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            {!isCollapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--text-secondary)' }}>
                {section.title}
              </p>
            )}
            {section.links.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
              const prefetchHandlers = getLinkPrefetch(to);
              return (
                <Link
                  key={to}
                  to={to}
                  title={isCollapsed ? label : ""}
                  {...prefetchHandlers}
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
        ))}
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
