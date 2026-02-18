import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Bars3Icon } from "@heroicons/react/24/outline";
import DesktopNav from "./navbar/DesktopNav";
import UserMenu from "./navbar/UserMenu";
import MobileNav from "./navbar/MobileNav";

const Navbar = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  // Close mobile menu on navigation
  React.useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-16">
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="glass-panel sticky top-0 z-50 transition-all duration-300 border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl shadow-glow flex items-center justify-center transform group-hover:scale-105 transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                <span className="text-white font-bold text-lg font-display">TP</span>
              </div>
              <span className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-primary-600 transition-colors font-display">
                Transcounty
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <DesktopNav user={user} />

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <UserMenu user={user} handleLogout={handleLogout} />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-600 hover:text-primary-600 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              aria-label="Toggle menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNav isOpen={isOpen} user={user} handleLogout={handleLogout} />
    </nav>
  );
};

export default Navbar;
