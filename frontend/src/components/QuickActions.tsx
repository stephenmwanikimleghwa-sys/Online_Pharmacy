import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCartIcon,
  HeartIcon,
  ClockIcon,
  UserIcon,
  BellIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  count?: number;
  onClick?: () => void;
  badge?: string;
}

interface QuickActionsProps {
  items?: QuickAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

const defaultQuickActions: QuickAction[] = [
  {
    icon: ShoppingCartIcon,
    label: 'Cart',
    href: '/cart',
    count: 0
  },
  {
    icon: HeartIcon,
    label: 'Wishlist',
    href: '/wishlist',
    count: 0
  },
  {
    icon: ClockIcon,
    label: 'Recent',
    href: '/recent'
  },
  {
    icon: BellIcon,
    label: 'Notifications',
    count: 0,
    badge: 'new'
  }
];

const QuickActions: React.FC<QuickActionsProps> = ({
  items = defaultQuickActions,
  position = 'bottom-right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  const handleActionClick = (item: QuickAction) => {
    if (item.onClick) {
      item.onClick();
    }
    setIsOpen(false);
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      {/* Main button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-label="Quick actions"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )}
      </button>

      {/* Action items */}
      <div
        className={`absolute bottom-16 right-0 flex flex-col gap-2 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const hasCount = item.count !== undefined && item.count > 0;

          if (item.href) {
            return (
              <Link
                key={index}
                to={item.href}
                className="relative group flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl shadow-md transition-all duration-200 hover:scale-105"
                aria-label={item.label}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {hasCount && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {item.count > 9 ? '9+' : item.count}
                    </span>
                  )}
                </div>
                <span className="font-medium text-sm">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          }

          return (
            <button
              key={index}
              onClick={() => handleActionClick(item)}
              className="relative group flex items-center gap-3 bg-white hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl shadow-md transition-all duration-200 hover:scale-105 w-full"
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {hasCount && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {item.count > 9 ? '9+' : item.count}
                  </span>
                )}
              </div>
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
