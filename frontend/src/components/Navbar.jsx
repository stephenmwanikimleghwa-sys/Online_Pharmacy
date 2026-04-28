import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Bars3Icon, SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import DesktopNav from "./navbar/DesktopNav";
import UserMenu from "./navbar/UserMenu";
import MobileNav from "./navbar/MobileNav";

const Navbar = () => {
  const { user, logout, loading } = useAuth();
  const { theme, setTheme, effectiveTheme } = useTheme();
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

  if (loading) {
    return (
      <nav className="nav-premium sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
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
    <nav className="nav-premium sticky top-0 z-50" role="navigation" aria-label="Main">
      <div className="nav-accent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link
              to="/"
              className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl"
              aria-label="Transcounty Pharmacy - Home"
            >
              <div
                className="nav-logo-mark group-hover:scale-105 group-hover:shadow-premium transition-all duration-300"
                aria-hidden
              />
              <span className="nav-brand-text">Transcounty</span>
            </Link>
          </div>

          <DesktopNav user={user} />

          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#262626] border border-transparent dark:border-white/5 transition-all shadow-sm"
              aria-label="Toggle Dark Mode"
            >
              {effectiveTheme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <UserMenu user={user} handleLogout={handleLogout} />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#262626] border border-transparent dark:border-white/5 transition-all shadow-sm"
              aria-label="Toggle Dark Mode"
            >
              {effectiveTheme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="nav-mobile-btn"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              aria-expanded={isOpen}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <MobileNav isOpen={isOpen} user={user} handleLogout={handleLogout} />
    </nav>
  );
};

export default Navbar;
