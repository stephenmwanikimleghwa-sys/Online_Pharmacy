import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Bars3Icon,
  SunIcon,
  MoonIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import MobileNav from "./navbar/MobileNav";
import BranchSelector from "./BranchSelector";
import SyncStatusIndicator from "./SyncStatusIndicator";

const Navbar = () => {
  const { user, logout, loading } = useAuth();
  const { setTheme, effectiveTheme } = useTheme();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const themeToggle = (
    <button
      type="button"
      onClick={() => setTheme(effectiveTheme === "dark" ? "light" : "dark")}
      className="form-cancel-btn flex items-center justify-center p-2 rounded-lg"
      aria-label="Toggle theme"
      title={effectiveTheme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {effectiveTheme === "dark" ? (
        <SunIcon className="w-5 h-5" />
      ) : (
        <MoonIcon className="w-5 h-5" />
      )}
    </button>
  );

  const logoutBtn = user ? (
    <button
      type="button"
      onClick={handleLogout}
      className="nav-logout-btn flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold"
      title="Log out"
    >
      <ArrowRightOnRectangleIcon className="w-5 h-5" />
      <span className="hidden sm:inline">Log out</span>
    </button>
  ) : null;

  if (loading && !user) {
    return (
      <nav className="nav-premium sticky top-0 z-50 flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-end items-center h-12 md:h-14">
            <div className="flex items-center gap-2 text-neutral-500">
              <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Loading...</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="nav-premium sticky top-0 z-50 flex-shrink-0" role="navigation" aria-label="Main">
      <div className="nav-accent" />
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 md:h-14">
          {/* Mobile: menu + brand */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="nav-mobile-btn"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <Link
              to="/"
              className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 rounded-xl"
              aria-label="Transcounty Pharmacy - Home"
              style={{ "--tw-ring-color": "var(--color-primary)" }}
            >
              <div className="nav-logo-mark w-8 h-8 text-xs group-hover:scale-105 transition-transform" aria-hidden>
                TP
              </div>
              <span className="nav-brand-text text-sm font-bold">Transcounty</span>
            </Link>
          </div>

          {/* Desktop: left spacer / sync */}
          <div className="hidden md:flex items-center gap-3 min-w-0">
            {user ? <SyncStatusIndicator /> : null}
          </div>

          {/* Top-right actions — theme + logout (desktop + mobile) */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="md:hidden">
              <BranchSelector />
            </div>
            {themeToggle}
            {logoutBtn}
          </div>
        </div>
      </div>

      <MobileNav isOpen={isOpen} user={user} handleLogout={handleLogout} onClose={() => setIsOpen(false)} />
    </nav>
  );
};

export default Navbar;
