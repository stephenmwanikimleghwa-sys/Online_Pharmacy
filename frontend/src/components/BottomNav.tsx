import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  UserCircleIcon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
  ShoppingBagIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const getDashboardHref = (role?: string): string => {
    switch (role) {
      case 'admin': return '/admin/dashboard';
      case 'pharmacist': return '/branch/dashboard';
      case 'cashier': return '/cashier/dashboard';
      case 'customer': return '/customer/dashboard';
      default: return '/account';
    }
  };

  const getUserManagementHref = (): string => {
    if (user?.role === 'admin') return '/admin/users';
    if (user?.role === 'pharmacist' || user?.role === 'cashier') return '/customers';
    return '/account';
  };

  // Post-login order requested: Home, Dashboard, Inventory, OTC Sale, User Management, Profile
  const loggedInItems = [
    { label: 'Home', href: '/', icon: HomeIcon },
    { label: 'Dashboard', href: getDashboardHref(user?.role), icon: Squares2X2Icon },
    { label: 'Inventory', href: '/inventory', icon: ClipboardDocumentListIcon },
    { label: 'OTC Sale', href: '/otc-sales', icon: ShoppingBagIcon },
    { label: 'User Management', href: getUserManagementHref(), icon: UsersIcon },
    { label: 'Profile', href: '/account', icon: UserCircleIcon },
  ];

  const navItems = user ? loggedInItems : [{ label: 'Home', href: '/', icon: HomeIcon }];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200  z-40 md:hidden"
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className={`flex items-center h-16 px-2 ${!user ? 'justify-center gap-8' : 'justify-around'}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`relative flex items-center justify-center flex-1 max-w-[80px] h-full transition-colors ${
                isActive
                  ? 'text-primary dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 btn-primary dark:bg-indigo-400 rounded-full" />
              )}
              <Icon className="h-6 w-6" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
