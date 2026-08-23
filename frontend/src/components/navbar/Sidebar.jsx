import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { usePrefetchOnHover } from "../../hooks/usePrefetchOnHover";
import { QUERY_KEYS } from "../../lib/queryKeys";
import { STALE_TIMES } from "../../lib/staleTimes";
import { unwrapList } from "../../utils/parseApiData";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import BranchSelector from "../BranchSelector";
import { formatLoginAt } from "../../utils/formatLoginAt";
import { getNavGroups } from "./navConfig";

const Sidebar = () => {
  const location = useLocation();
  const { user, activeBranch } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("transcounty_sidebar_collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("transcounty_sidebar_collapsed", isCollapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [isCollapsed]);
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
    if (to === "/admin/users") return usersPrefetch;
    if (to.includes("supplier")) return suppliersPrefetch;
    return {};
  };

  const sections = [
    { title: "Main", links: mainLinks },
    { title: "Ops", links: operationsLinks },
    { title: "Admin", links: adminLinks },
  ].filter((section) => section.links.length > 0);

  return (
    <div
      className={`hidden md:flex md:flex-col ${isCollapsed ? "w-[4.5rem]" : "w-56"} h-full nav-premium border-r z-40 transition-[width] duration-200 ease-out flex-shrink-0 relative overflow-hidden`}
      style={{ borderColor: "var(--border-primary)" }}
    >
      {/* Header: compact brand + natural collapse control */}
      <div
        className="flex-shrink-0 px-2.5 pt-3 pb-2"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <div className={`flex items-center ${isCollapsed ? "flex-col gap-2" : "gap-2"}`}>
          <Link
            to="/"
            className={`flex items-center min-w-0 group focus:outline-none focus-visible:ring-2 rounded-lg ${
              isCollapsed ? "justify-center" : "flex-1 gap-2"
            }`}
            style={{ "--tw-ring-color": "var(--color-primary)" }}
            title="Transcounty Home"
          >
            <span className="nav-logo-mark" aria-hidden>
              TP
            </span>
            {!isCollapsed && (
              <span className="nav-brand-text font-semibold text-[13px] tracking-tight truncate group-hover:opacity-80 transition-opacity">
                Transcounty
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsCollapsed((v) => !v)}
            className="flex-shrink-0 p-1.5 rounded-md transition-colors"
            style={{
              color: "var(--text-secondary)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-field)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            title={isCollapsed ? "Expand menu" : "Collapse menu"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4" />
            ) : (
              <ChevronLeftIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        {!isCollapsed && (
          <div className="mt-2.5 w-full flex justify-center">
            <BranchSelector />
          </div>
        )}
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2.5 py-3 space-y-3">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed && (
              <p
                className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider"
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
                    isCollapsed ? "justify-center p-2.5" : "px-2.5 py-2"
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

      {/* Account only — theme / logout live in the top-right navbar */}
      <div
        className="px-2.5 py-3 flex-shrink-0"
        style={{
          borderTop: "1px solid var(--border-primary)",
          background: "var(--bg-card)",
        }}
      >
        {user ? (
          <Link
            to="/account"
            title={isCollapsed ? "Manage Account" : ""}
            className={`data-cell flex items-center gap-2.5 ${
              isCollapsed ? "p-2 justify-center" : "px-2.5 py-2"
            } rounded-lg transition-colors group`}
          >
            <div className="nav-avatar w-8 h-8 text-xs flex-shrink-0">
              {user.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  {user.username}
                </p>
                <p
                  className="text-[10px] font-semibold truncate capitalize"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {user.role}
                </p>
                {formatLoginAt(user.session_started_at || user.last_login) ? (
                  <p
                    className="text-[10px] truncate mt-0.5"
                    style={{ color: "var(--text-secondary)" }}
                    title="Signed in at"
                  >
                    In {formatLoginAt(user.session_started_at || user.last_login)}
                  </p>
                ) : null}
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
