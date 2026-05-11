import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { 
  SunIcon, MoonIcon, ArrowRightOnRectangleIcon, ChevronLeftIcon, ChevronRightIcon,
  HomeIcon, ShoppingBagIcon, ChartBarIcon, ClipboardDocumentListIcon, Squares2X2Icon, ShieldCheckIcon, DocumentTextIcon, DocumentDuplicateIcon
} from "@heroicons/react/24/outline";

const getDashboardHref = (role) => {
  switch (role) {
    case 'admin': return '/admin/dashboard';
    case 'pharmacist': return '/pharmacist/dashboard';
    case 'cashier': return '/cashier/dashboard';
    case 'customer': return '/customer/dashboard';
    default: return '/account';
  }
};

const getNavLinks = (user) => {
  const base = [
    { to: "/", label: "Home", icon: HomeIcon },
    { to: "/products", label: "Store", icon: ShoppingBagIcon },
  ];

  if (user) {
    base.splice(1, 0, { to: getDashboardHref(user.role), label: "Dashboard", icon: Squares2X2Icon });
  }

  if (user?.role === "admin" || user?.role === "pharmacist") {
    base.push(
      { to: "/inventory", label: "Inventory", icon: ClipboardDocumentListIcon },
      { to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon },
      { to: "/reports", label: "Reports", icon: ChartBarIcon },
      { to: "/documents", label: "Documents", icon: DocumentTextIcon },
      { to: "/licensing", label: "Licensing", icon: ShieldCheckIcon },
      { to: "/dispensing-logs", label: "Logs", icon: DocumentDuplicateIcon }
    );
  } else if (user?.role === "cashier") {
    base.push(
      { to: "/otc-sales", label: "OTC Sales", icon: ShoppingBagIcon }
    );
  } else if (user?.role === "auditor") {
    base.push(
      { to: "/inventory", label: "Inventory", icon: ClipboardDocumentListIcon },
      { to: "/reports", label: "Reports", icon: ChartBarIcon }
    );
  }
  return base;
};

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme, effectiveTheme } = useTheme();
  const { user, logout } = useAuth();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const links = getNavLinks(user ?? null);

  const onLogoutClick = () => {
    if (logout) {
      logout();
    } else {
      navigate('/login');
    }
  };

  return (
    <div className={`hidden md:flex md:flex-col ${isCollapsed ? 'w-20' : 'w-64'} h-full nav-premium border-r border-[#0D3F60] z-40 transition-all duration-300 flex-shrink-0 relative overflow-visible shadow-2xl`}>
      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-[#C8A84B] text-[#1A1A1A] rounded-full p-1 shadow-lg border-2 border-[#0A2E4A] hover:bg-[#e3a842] hover:scale-110 transition-all z-50"
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {isCollapsed ? <ChevronRightIcon className="w-4 h-4 font-bold" /> : <ChevronLeftIcon className="w-4 h-4 font-bold" />}
      </button>

      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 w-full h-32 bg-gradient-to-b from-[#C8A84B]/10 to-transparent pointer-events-none" />

      {/* Brand & Logo Area */}
      <div className="p-6 pb-8 border-b border-[#0D3F60]/50 sticky top-0 z-10 flex flex-col items-center justify-center gap-3">
        <Link to="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A84B] rounded-xl flex-col text-center">
            <div className={`${isCollapsed ? 'w-10 h-10' : 'w-16 h-16'} rounded-2xl bg-gradient-to-br from-[#0D3F60] to-[#C8A84B] shadow-glow flex items-center justify-center text-white font-bold text-xl group-hover:scale-105 transition-all duration-300`}>
                TP
            </div>
            {!isCollapsed && (
              <span className="font-display font-bold text-xl text-[#C8E8F5] tracking-tight group-hover:text-[#C8A84B] transition-colors mt-2 whitespace-nowrap overflow-hidden">
                  Transcounty
              </span>
            )}
        </Link>
      </div>

      {/* Navigation Links Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-1.5 scrollbar-thin scrollbar-thumb-[#0D3F60] scrollbar-track-transparent">
        {links.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3'} rounded-xl text-sm font-semibold transition-all duration-200 group ${
                active 
                ? "text-[#C8A84B] bg-[#C8A84B]/10 shadow-[0_0_10px_rgba(200,168,75,0.05)] border border-[#C8A84B]/20" 
                : "text-[#C8E8F5] hover:text-[#C8A84B] hover:bg-[#0D3F60]/40 border border-transparent"
              }`}
              title={isCollapsed ? label : ""}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 transition-transform ${active ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'} ${!isCollapsed ? 'mr-3' : ''}`} />
              {!isCollapsed && <span className="truncate whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </div>

      {/* User Actions & Footer Area */}
      <div className="p-4 border-t border-[#0D3F60]/50 bg-[#0A2E4A]/50 backdrop-blur-sm z-10 sticky bottom-0">
        <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2' : 'justify-between space-x-2'} mb-3`}>
            <button
                onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl bg-[#0D3F60]/40 text-[#C8E8F5] hover:bg-[#0D3F60] hover:text-[#C8A84B] border border-transparent hover:border-[#5A7F98]/30 transition-all shadow-sm w-full flex justify-center flex-1"
                aria-label="Toggle Dark Mode"
                title="Toggle Theme"
            >
                {effectiveTheme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
            <button
                onClick={onLogoutClick}
                className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-transparent hover:border-red-500/20 transition-all w-full flex justify-center flex-1"
                title="Logout"
            >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
        </div>
        
        {user ? (
          <Link 
            to="/account" 
            className={`flex items-center gap-3 ${isCollapsed ? 'p-2 justify-center' : 'p-3'} rounded-xl bg-[#0D3F60]/40 border border-[#5A7F98]/20 hover:border-[#C8A84B]/40 hover:bg-[#0D3F60] transition-colors cursor-pointer group`}
            title={isCollapsed ? "Manage Account" : ""}
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] shadow-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 border border-white/10 group-hover:shadow-[0_0_15px_rgba(124,58,237,0.4)] transition-shadow`}>
              {user.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <p className="text-sm font-bold text-[#f5f8fa] truncate group-hover:text-white transition-colors">{user.username}</p>
                <p className="text-[10px] font-semibold text-[#5a7f98] truncate uppercase tracking-widest group-hover:text-[#C8A84B] transition-colors">{user.role}</p>
              </div>
            )}
          </Link>
        ) : (
          <Link to="/login" className="nav-cta-btn flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm">
             {!isCollapsed && "Sign In"}
             {isCollapsed && "?"}
          </Link>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
