import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Header = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { cartItems } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const navLink = (to, label) => {
    const isActive = location.pathname === to;
    return (
      <Link
        to={to}
        className={`nav-link ${isActive ? 'nav-link-active' : 'nav-link-inactive'}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="nav-premium sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4 md:py-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="nav-logo-mark flex items-center justify-center">
              <span className="text-white font-bold text-sm">PH</span>
            </div>
            <span className="nav-brand-text">PharmacyHub KE</span>
          </Link>

          {/* Search Bar — desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field w-full pl-10 pr-4 py-2"
              />
              <button
                type="submit"
                className="absolute left-3 top-2.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLink('/', 'Home')}
            {navLink('/products', 'Products')}
            {user && navLink('/account', 'Account')}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3 ml-4">
            {/* Cart */}
            <Link to="/cart" className="relative nav-link-inactive p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 1.5M7 13l-1.5-1.5M16 16a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
              {cartCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold"
                  style={{ background: 'var(--color-accent)' }}
                >
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User menu or Login */}
            {user ? (
              <div className="relative group">
                <button className="nav-account-btn">
                  <span className="nav-avatar">{(user.first_name || user.username || 'U')[0].toUpperCase()}</span>
                  <span className="text-sm font-medium hidden sm:inline" style={{ color: 'var(--text-primary)' }}>
                    {user.first_name || user.username}
                  </span>
                </button>
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-1"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-primary)',
                    backdropFilter: 'blur(18px)',
                    boxShadow: 'var(--glass-shadow)',
                  }}
                >
                  <Link
                    to="/account"
                    className="block px-4 py-2 text-sm transition-colors"
                    style={{ color: 'var(--text-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--color-highlight)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  >Profile</Link>
                  {(user.role === 'pharmacist' || user.role === 'admin') && (
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--color-highlight)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    >Dashboard</Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="nav-logout-btn w-full text-left"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="btn-primary nav-cta-btn px-4 py-2 text-sm font-semibold rounded-xl">
                Login
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden nav-mobile-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden mb-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pl-10 pr-4 py-2"
            />
            <button
              type="submit"
              className="absolute left-3 top-2.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>

        {/* Mobile nav panel */}
        {menuOpen && (
          <div className="md:hidden mobile-nav-panel rounded-xl mb-3 p-2 flex flex-col gap-1">
            {['/', '/products'].map((path) => {
              const labels = { '/': 'Home', '/products': 'Products' };
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium ${isActive ? 'mobile-nav-cta' : 'mobile-nav-link'}`}
                >
                  {labels[path]}
                </Link>
              );
            })}
            {user && (
              <Link
                to="/account"
                onClick={() => setMenuOpen(false)}
                className="mobile-nav-link block px-4 py-2 rounded-lg text-sm font-medium"
              >
                Account
              </Link>
            )}
            {!user && (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="mobile-nav-cta block px-4 py-2 rounded-lg text-sm font-medium text-center"
              >
                Login
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
