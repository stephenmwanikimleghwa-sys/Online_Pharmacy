import React, { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Footer from '../components/Footer';

const CAPABILITIES = [
  {
    title: 'POS & OTC sales',
    body: 'Ring up over-the-counter sales and print receipts from the till.',
  },
  {
    title: 'Inventory & stock',
    body: 'Track batches, expiries, transfers, and restock across branches.',
  },
  {
    title: 'Prescriptions',
    body: 'Validate and dispense scripts with a clear audit trail.',
  },
  {
    title: 'Finance & reports',
    body: 'Quotations, receivables, and branch performance in one place.',
  },
];

const Home = () => {
  const { isAuthenticated, getPostLoginPath, loading: authLoading } = useAuth();
  const { effectiveTheme, setTheme } = useTheme();

  useEffect(() => {
    document.title = 'Transcounty Pharmacy | Staff Ops';
  }, []);

  if (!authLoading && isAuthenticated) {
    return <Navigate to={getPostLoginPath()} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-gradient)' }}>
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--border-primary)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="nav-logo-mark w-9 h-9 flex items-center justify-center text-white font-display font-bold text-xs">
            TP
          </div>
          <span className="nav-brand-text font-display font-bold text-lg tracking-tight">
            Transcounty
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
            className="form-cancel-btn p-2 rounded-lg"
            aria-label="Toggle theme"
          >
            {effectiveTheme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
          <Link to="/login" className="btn-primary px-5 py-2.5 rounded-lg text-white text-sm font-semibold">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="max-w-2xl">
          <p
            className="text-sm font-semibold mb-4"
            style={{ color: 'var(--color-primary)' }}
          >
            Staff operations · Kenya
          </p>
          <h1
            className="font-display font-bold tracking-tight leading-[1.05] mb-5"
            style={{
              color: 'var(--text-primary)',
              fontSize: 'clamp(2.75rem, 8vw, 4.5rem)',
            }}
          >
            Transcounty
          </h1>
          <p
            className="text-lg md:text-xl leading-relaxed mb-10 max-w-xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            Pharmacy operations for your branches — sales, stock, prescriptions, and finance in one workspace.
          </p>
          <div className="flex flex-wrap gap-3 mb-16">
            <Link
              to="/login"
              className="btn-primary inline-flex items-center px-7 py-3.5 rounded-lg text-white font-semibold text-sm"
            >
              Sign in to continue
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
          {CAPABILITIES.map((item) => (
            <div
              key={item.title}
              className="glass-card p-5 md:p-6"
              style={{ borderRadius: 'var(--radius-surface)' }}
            >
              <h2
                className="font-display font-semibold text-base mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
