import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import SyncStatusIndicator from "../SyncStatusIndicator";
import api from "../../services/api";
import { usePrefetchOnHover } from "../../hooks/usePrefetchOnHover";
import { QUERY_KEYS } from "../../lib/queryKeys";
import { STALE_TIMES } from "../../lib/staleTimes";
import { unwrapList } from "../../utils/parseApiData";
import {
  SunIcon, MoonIcon, ArrowRightOnRectangleIcon, ChevronLeftIcon, ChevronRightIcon,
  HomeIcon, ShoppingBagIcon, ChartBarIcon, ClipboardDocumentListIcon, Squares2X2Icon,
  ShieldCheckIcon, DocumentTextIcon, DocumentDuplicateIcon, BuildingOffice2Icon,
  BanknotesIcon, DocumentPlusIcon, UserGroupIcon, ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import BranchSelector from "../BranchSelector";

const getDashboardHref = (role) => {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "pharmacist":
      return "/branch/dashboard";
    case "cashier":
      return "/cashier/dashboard";
    case "auditor":
      return "/reports";
    case "customer":
      return "/customer/dashboard";
    default:
      return "/account";
  }
};

/** Compact labels — keep the nav scannable without vertical scroll on typical laptop heights. */
const getNavGroups = (user) => {
  const mainLinks = [];

  if (user) {
    mainLinks.push(
      { to: getDashboardHref(user.role), label: "Dashboard", icon: Squares2X2Icon },
      { to: "/products", label: "Catalogue", icon: ShoppingBagIcon },
    );
  } else {
    mainLinks.push({ to: "/", label: "Home", icon: HomeIcon });
  }

  const operationsLinks = [];
  const adminLinks = [];

  if (user?.role === "admin") {
    operationsLinks.push(
      { to: "/inventory/management", label: "Inventory", icon: ClipboardDocumentListIcon },
      { to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon },
      { to: "/customers", label: "Customers", icon: UserGroupIcon },
      { to: "/purchase-orders", label: "Purchases", icon: DocumentPlusIcon },
      { to: "/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/quotations", label: "Quotations", icon: DocumentPlusIcon },
      { to: "/returns", label: "Returns", icon: ArrowUturnLeftIcon },
      { to: "/reconciliation", label: "Reconcile", icon: ExclamationTriangleIcon },
      { to: "/clinical", label: "Clinical", icon: UserGroupIcon },
      { to: "/documents", label: "Documents", icon: DocumentTextIcon },
      { to: "/licensing", label: "Licensing", icon: ShieldCheckIcon },
    );
    adminLinks.push(
      { to: "/admin/branches", label: "Branches", icon: BuildingOffice2Icon },
      { to: "/admin/users", label: "Users", icon: ShieldCheckIcon },
      { to: "/dispensing-logs", label: "Audit Logs", icon: DocumentDuplicateIcon },
    );
  } else if (user?.role === "pharmacist") {
    operationsLinks.push(
      { to: "/inventory/management", label: "Inventory", icon: ClipboardDocumentListIcon },
      { to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon },
      { to: "/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/quotations", label: "Quotations", icon: DocumentPlusIcon },
      { to: "/returns", label: "Returns", icon: ArrowUturnLeftIcon },
      { to: "/reconciliation", label: "Reconcile", icon: ExclamationTriangleIcon },
      { to: "/clinical", label: "Clinical", icon: UserGroupIcon },
      { to: "/documents", label: "Documents", icon: DocumentTextIcon },
      { to: "/licensing", label: "Licensing", icon: ShieldCheckIcon },
      { to: "/dispensing-logs", label: "Logs", icon: DocumentDuplicateIcon },
    );
  } else if (user?.role === "cashier") {
    operationsLinks.push({ to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon });
  } else if (user?.role === "auditor") {
    operationsLinks.push(
      { to: "/inventory/management", label: "Inventory", icon: ClipboardDocumentListIcon },
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
  const location = useLocation();
  const navigate = useNavigate();
  const { effectiveTheme, setTheme } = useTheme();
  const { user, logout, activeBranch } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { mainLinks, operationsLinks, adminLinks } = getNavGroups(user ?? null);

  const inventoryPrefetch = usePrefetchOnHover(
    QUERY_KEYS.inventory(activeBranch?.id, { per_page: 500 }),
    async () => {
      const res = await api.get("/inventory/list/", { params: { per_page: 500 } });
      const data = res.data || {};
      return data.products || data.results || unwrapList(data);
    },
    STALE_TIMES.SLOW,
  );
  const suppliersPrefetch = usePrefetchOnHover(
    QUERY_KEYS.suppliers,
    () => api.get("/inventory/suppliers/").then((r) => r.data),
    STALE_TIMES.SLOW,
  );
  const customersPrefetch = usePrefetchOnHover(
    QUERY_KEYS.customers,
    async () => {
      const res = await api.get("/auth/customers/");
      return unwrapList(res.data);
    },
    STALE_TIMES.SLOW,
  );
  const reportsPrefetch = usePrefetchOnHover(
    QUERY_KEYS.dashboardGlobal,
    () => api.get("/dashboard/global-overview/").then((r) => r.data),
    STALE_TIMES.FAST,
  );
  const logsPrefetch = usePrefetchOnHover(
    QUERY_KEYS.dispensingLogs({}),
    async () => {
      const res = await api.get("/inventory/dispensations/", { params: {} });
      return unwrapList(res.data);
    },
    STALE_TIMES.MEDIUM,
  );
  const usersPrefetch = usePrefetchOnHover(
    QUERY_KEYS.users,
    async () => {
      const res = await api.get("/auth/admin/users/");
      return unwrapList(res.data);
    },
    STALE_TIMES.SLOW,
  );

  const getLinkPrefetch = (to) => {
    if (to.includes("/inventory/management") || to.includes("/inventory/control")) {
      return inventoryPrefetch;
    }
    if (to === "/customers") return customersPrefetch;
    if (to === "/reports" || to.includes("/reports")) return reportsPrefetch;
    if (to === "/dispensing-logs") return logsPrefetch;
    if (to === "/admin/users") return usersPrefetch;
    if (to.includes("supplier")) return suppliersPrefetch;
    return {};
  };

  const sections = [
    { title: "Main", links: mainLinks },
    { title: "Ops", links: operationsLinks },
    { title: "Admin", links: adminLinks },
  ].filter((section) => section.links.length > 0);

  const onLogoutClick = () => {
    if (logout) logout();
    else navigate("/login");
  };

  return (
    <div
      className={`hidden md:flex md:flex-col ${isCollapsed ? "w-[4.25rem]" : "w-56"} h-full nav-premium border-r z-40 transition-all duration-300 flex-shrink-0 relative overflow-hidden`}
      style={{ borderColor: "var(--border-primary)" }}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 btn-primary rounded-full p-1 shadow-md z-50 flex items-center justify-center"
        style={{ width: 22, height: 22 }}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? (
          <ChevronRightIcon className="w-3 h-3 text-white" />
        ) : (
          <ChevronLeftIcon className="w-3 h-3 text-white" />
        )}
      </button>

      {/* Brand — compact */}
      <div
        className={`px-3 ${isCollapsed ? "py-3" : "pt-3 pb-2"} flex flex-col items-center gap-1.5 flex-shrink-0`}
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <Link
          to="/"
          className="flex flex-col items-center gap-1 group focus:outline-none focus-visible:ring-2 rounded-lg"
          style={{ "--tw-ring-color": "var(--color-primary)" }}
        >
          <div
            className={`${isCollapsed ? "w-9 h-9 text-sm" : "w-10 h-10 text-base"} nav-logo-mark flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform`}
          >
            TP
          </div>
          {!isCollapsed && (
            <span className="nav-brand-text font-bold text-sm tracking-tight group-hover:opacity-80 transition-opacity whitespace-nowrap">
              Transcounty
            </span>
          )}
        </Link>
        {!isCollapsed && (
          <div className="w-full pt-1 flex justify-center">
            <BranchSelector />
          </div>
        )}
      </div>

      {/* Nav — fills remaining height; scrolls only if viewport is very short */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-2">
        {sections.map((section) => (
          <div key={section.title} className="space-y-0.5">
            {!isCollapsed && (
              <p
                className="px-2.5 pt-0.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--text-secondary)" }}
              >
                {section.title}
              </p>
            )}
            {section.links.map(({ to, label, icon: Icon }) => {
              const active =
                location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
              const prefetchHandlers = getLinkPrefetch(to);
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  {...prefetchHandlers}
                  className={`flex items-center ${
                    isCollapsed ? "justify-center p-2" : "px-2.5 py-1.5"
                  } rounded-lg text-[13px] font-medium transition-colors duration-150 group`}
                  style={
                    active
                      ? {
                          color: "#ffffff",
                          background: "var(--btn-gradient)",
                        }
                      : {
                          color: "var(--text-primary)",
                          background: "transparent",
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "var(--bg-field)";
                      e.currentTarget.style.color = "var(--color-highlight)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }
                  }}
                >
                  <Icon
                    className={`w-[1.125rem] h-[1.125rem] flex-shrink-0 ${!isCollapsed ? "mr-2.5" : ""}`}
                  />
                  {!isCollapsed && <span className="truncate leading-tight">{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — tight */}
      <div
        className="px-2 py-2 flex-shrink-0 space-y-1.5"
        style={{
          borderTop: "1px solid var(--border-primary)",
          background: "var(--bg-card)",
        }}
      >
        {user ? (
          <div className={`flex ${isCollapsed ? "justify-center" : ""}`}>
            <SyncStatusIndicator />
          </div>
        ) : null}

        <div
          className={`flex items-center ${isCollapsed ? "flex-col gap-1" : "justify-between gap-1.5"}`}
        >
          <button
            type="button"
            onClick={() => setTheme(effectiveTheme === "dark" ? "light" : "dark")}
            className="form-cancel-btn flex items-center justify-center flex-1 py-1.5"
            aria-label="Toggle Dark Mode"
            title="Toggle Theme"
          >
            {effectiveTheme === "dark" ? (
              <SunIcon className="w-4 h-4" />
            ) : (
              <MoonIcon className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onLogoutClick}
            className="nav-logout-btn flex items-center justify-center flex-1 py-1.5"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>

        {user ? (
          <Link
            to="/account"
            title={isCollapsed ? "Manage Account" : ""}
            className={`data-cell flex items-center gap-2 ${
              isCollapsed ? "p-1.5 justify-center" : "px-2 py-1.5"
            } rounded-lg transition-colors group`}
          >
            <div className="nav-avatar w-7 h-7 text-xs flex-shrink-0">
              {user.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  {user.username}
                </p>
                <p className="text-[10px] font-semibold truncate capitalize" style={{ color: "var(--text-secondary)" }}>
                  {user.role}
                </p>
              </div>
            )}
          </Link>
        ) : (
          <Link
            to="/login"
            className="btn-primary nav-cta-btn flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs"
          >
            {isCollapsed ? "→" : "Sign In"}
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
