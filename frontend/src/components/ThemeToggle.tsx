import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const themes = [
    { value: 'light' as const, icon: SunIcon, label: 'Light' },
    { value: 'dark' as const, icon: MoonIcon, label: 'Dark' },
    { value: 'system' as const, icon: ComputerDesktopIcon, label: 'System' },
  ];

  return (
    <div className="relative group">
      <button
        className="p-2 rounded-lg backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          background: 'var(--bg-field)',
          border: '1px solid var(--border-primary)',
          color: 'var(--text-secondary)',
        }}
        aria-label="Toggle theme"
      >
        {effectiveTheme === 'dark' ? (
          <MoonIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
        ) : (
          <SunIcon className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
        )}
      </button>

      {/* Theme dropdown */}
      <div
        className="absolute right-0 mt-2 w-36 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          backdropFilter: 'blur(18px)',
        }}
      >
        {themes.map((t) => {
          const Icon = t.icon;
          const isActive = theme === t.value;

          return (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors"
              style={{
                background: isActive ? 'rgba(217, 70, 239, 0.12)' : 'transparent',
                color: isActive ? 'var(--color-highlight)' : 'var(--text-primary)',
              }}
              aria-label={`Switch to ${t.label} theme`}
              aria-pressed={isActive}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--color-accent)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeToggle;
