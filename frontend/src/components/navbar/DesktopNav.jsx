import React from "react";
import { Link, useLocation } from "react-router-dom";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/products", label: "Products" },
];

const navLinks = (user) => {
  const base = [...publicLinks];
  if (user?.role === "admin" || user?.role === "pharmacist") {
    base.push(
      { to: "/inventory", label: "Inventory" },
      { to: "/reports", label: "Reports" },
      { to: "/licensing", label: "Licensing" },
      { to: "/dispensing-logs", label: "Logs" }
    );
  } else if (user?.role === "auditor") {
    base.push(
      { to: "/inventory", label: "Inventory" },
      { to: "/reports", label: "Reports" }
    );
  }
  return base;
};

const DesktopNav = ({ user }) => {
  const location = useLocation();
  const links = navLinks(user ?? null);

  return (
    <div className="hidden md:flex items-center gap-0.5">
      {links.map(({ to, label }) => {
        const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            className={`nav-link ${active ? "nav-link-active" : "nav-link-inactive"}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
};

export default DesktopNav;
