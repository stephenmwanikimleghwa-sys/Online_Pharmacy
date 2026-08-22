import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Squares2X2Icon,
  ClipboardDocumentListIcon,
  ShoppingBagIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const getDashboardHref = (role?: string): string => {
    switch (role) {
      case 'admin': return '/admin/dashboard';
      case 'pharmacist': return '/branch/dashboard';
      case 'cashier': return '/cashier/dashboard';
      case 'auditor': return '/reports';
      case 'customer': return '/customer/dashboard';
      default: return '/account';
    }
  };

  const getInventoryHref = (role?: string): string => {
    if (role === 'cashier') return '/otc-sales';
    return '/inventory/management';
  };

  const navItems = [
    { label: 'Dashboard', href: getDashboardHref(user.role), icon: Squares2X2Icon },
    { label: 'Inventory', href: getInventoryHref(user.role), icon: ClipboardDocumentListIcon },
    { label: 'OTC Sale', href: '/otc-sales', icon: ShoppingBagIcon },
    { label: 'Profile', href: '/account', icon: UserCircleIcon },
  ];

  // Cashiers don't need a duplicate OTC entry — keep till + profile focused
  const items =
    user.role === 'cashier'
      ? [
          { label: 'Till', href: '/cashier/dashboard', icon: Squares2X2Icon },
          { label: 'OTC Sale', href: '/otc-sales', icon: ShoppingBagIcon },
          { label: 'Customers', href: '/customers', icon: ClipboardDocumentListIcon },
          { label: 'Profile', href: '/account', icon: UserCircleIcon },
        ]
      : navItems;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-primary)',
      }}
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));

          return (
            <Link
              key={`${item.label}-${item.href}`}
              to={item.href}
              className="relative flex flex-col items-center justify-center flex-1 max-w-[88px] h-full gap-0.5 transition-colors"
              style={{ color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)' }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'var(--color-primary)' }}
                />
              )}
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-medium truncate max-w-full px-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
