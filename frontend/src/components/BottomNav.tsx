import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  ShoppingBagIcon,
  UserCircleIcon,
  ChartBarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { getDashboardHref } from "./navbar/navConfig";

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const staffItems = [
    { label: "Home", href: getDashboardHref(user.role), icon: Squares2X2Icon },
    { label: "Stock", href: "/inventory/management", icon: ClipboardDocumentListIcon },
    { label: "OTC", href: "/otc-sales", icon: ShoppingBagIcon },
    { label: "Reports", href: "/reports", icon: ChartBarIcon },
    { label: "Profile", href: "/account", icon: UserCircleIcon },
  ];

  const cashierItems = [
    { label: "Till", href: "/cashier/dashboard", icon: Squares2X2Icon },
    { label: "OTC", href: "/otc-sales", icon: ShoppingBagIcon },
    { label: "Customers", href: "/customers", icon: UserGroupIcon },
    { label: "Profile", href: "/account", icon: UserCircleIcon },
  ];

  const auditorItems = [
    { label: "Reports", href: "/reports", icon: ChartBarIcon },
    { label: "Stock", href: "/inventory/management", icon: ClipboardDocumentListIcon },
    { label: "Profile", href: "/account", icon: UserCircleIcon },
  ];

  let items = staffItems;
  if (user.role === "cashier") items = cashierItems;
  else if (user.role === "auditor") items = auditorItems;
  else if (user.role === "customer") {
    items = [
      { label: "Home", href: "/customer/dashboard", icon: Squares2X2Icon },
      { label: "Profile", href: "/account", icon: UserCircleIcon },
    ];
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background: "var(--bg-card)",
        borderTop: "1px solid var(--border-primary)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-14 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/" && location.pathname.startsWith(item.href));

          return (
            <Link
              key={`${item.label}-${item.href}`}
              to={item.href}
              className="relative flex flex-col items-center justify-center flex-1 max-w-[5.5rem] h-full gap-0.5 transition-colors touch-manipulation"
              style={{ color: isActive ? "var(--color-primary)" : "var(--text-secondary)" }}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-0.5 rounded-full"
                  style={{ background: "var(--color-primary)" }}
                />
              )}
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px] font-semibold truncate max-w-full px-0.5 leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
