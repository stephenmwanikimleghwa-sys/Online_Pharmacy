import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { getNavGroups } from "./navConfig";
import { formatLoginAt } from "../../utils/formatLoginAt";

const MobileNav = ({ isOpen, user, handleLogout, onClose }) => {
  const location = useLocation();

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const { mainLinks, operationsLinks, adminLinks } = getNavGroups(user ?? null);

  const sections = [
    { title: "Main", links: mainLinks },
    { title: "Ops", links: operationsLinks },
    { title: "Admin", links: adminLinks },
  ].filter((s) => s.links.length > 0);

  const linkClass = (active) =>
    `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors ${
      active ? "mobile-nav-link-active" : "mobile-nav-link"
    }`;

  return (
    <div className="fixed inset-0 z-[70] md:hidden" role="dialog" aria-modal="true" aria-label="Mobile menu">
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <aside
        className="absolute left-0 top-0 h-full w-[min(20rem,88vw)] flex flex-col shadow-2xl animate-[mobileDrawerIn_0.22s_ease-out]"
        style={{
          background: "var(--bg-card)",
          borderRight: "1px solid var(--border-primary)",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <div className="min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>
              {user ? `${user.first_name || user.username || "Staff"}` : "Menu"}
            </p>
            {user && formatLoginAt(user.session_started_at || user.last_login) ? (
              <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Signed in {formatLoginAt(user.session_started_at || user.last_login)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-5">
          {user ? (
            sections.map((section) => (
              <div key={section.title}>
                <p
                  className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.links.map(({ to, label, icon: Icon }) => {
                    const active =
                      location.pathname === to ||
                      (to !== "/" && location.pathname.startsWith(to));
                    return (
                      <Link
                        key={`${section.title}-${to}`}
                        to={to}
                        onClick={onClose}
                        className={linkClass(active)}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
                        <span className="truncate">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="nav-cta-btn flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-semibold"
            >
              Sign in
            </Link>
          )}
        </div>

        {user ? (
          <div
            className="flex-shrink-0 px-3 py-3 space-y-1"
            style={{ borderTop: "1px solid var(--border-primary)" }}
          >
            <Link
              to="/account"
              onClick={onClose}
              className={linkClass(location.pathname.startsWith("/account"))}
            >
              <UserCircleIcon className="h-5 w-5" />
              Profile
            </Link>
            <button
              type="button"
              onClick={() => {
                handleLogout();
                onClose?.();
              }}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold w-full text-left"
              style={{ color: "#dc2626" }}
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Log out
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
};

export default MobileNav;
