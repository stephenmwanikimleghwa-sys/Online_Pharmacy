import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCartIcon,
  HeartIcon,
  ClockIcon,
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
  { icon: ShoppingCartIcon, label: 'Cart',          href: '/cart',     count: 0 },
  { icon: HeartIcon,        label: 'Wishlist',      href: '/wishlist', count: 0 },
  { icon: ClockIcon,        label: 'Recent',        href: '/recent'               },
  { icon: BellIcon,         label: 'Notifications', count: 0, badge: 'new'        },
];

const positionClasses: Record<string, string> = {
  'bottom-right': 'bottom-6 right-6',
  'bottom-left':  'bottom-6 left-6',
  'top-right':    'top-6 right-6',
  'top-left':     'top-6 left-6',
};

/* Shared action item classes — glassmorphism */
const ACTION_ITEM_BASE =
  'relative group flex items-center gap-3 px-4 py-3 rounded-xl ' +
  'transition-all duration-200 hover:scale-105 w-full';

const QuickActions: React.FC<QuickActionsProps> = ({
  items = defaultQuickActions,
  position = 'bottom-right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleActionClick = (item: QuickAction) => {
    if (item.onClick) item.onClick();
    setIsOpen(false);
  };

  const renderBadge = (item: QuickAction) => {
    if (!item.badge) return null;
    return (
      <span
        className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full brand-mist"
        style={{ color: 'var(--color-primary)' }}
      >
        {item.badge}
      </span>
    );
  };

  const renderCount = (item: QuickAction) => {
    const hasCount = item.count !== undefined && item.count > 0;
    if (!hasCount) return null;
    return (
      <span
        className="absolute -top-2 -right-2 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
        style={{ background: 'var(--color-accent)' }}
      >
        {item.count! > 9 ? '9+' : item.count}
      </span>
    );
  };

  const itemStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    boxShadow: 'var(--glass-shadow)',
  };

  const renderItem = (item: QuickAction, index: number) => {
    const Icon = item.icon;
    const inner = (
      <>
        <div className="relative">
          <Icon className="h-5 w-5" aria-hidden="true" />
          {renderCount(item)}
        </div>
        <span className="font-medium text-sm">{item.label}</span>
        {renderBadge(item)}
      </>
    );

    if (item.href) {
      return (
        <Link
          key={index}
          to={item.href}
          className={ACTION_ITEM_BASE}
          style={itemStyle}
          aria-label={item.label}
        >
          {inner}
        </Link>
      );
    }

    return (
      <button
        key={index}
        onClick={() => handleActionClick(item)}
        className={ACTION_ITEM_BASE}
        style={itemStyle}
        aria-label={item.label}
      >
        {inner}
      </button>
    );
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 btn-primary text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none"
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
        {items.map((item, index) => renderItem(item, index))}
      </div>
    </div>
  );
};

export default QuickActions;
