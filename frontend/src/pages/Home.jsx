import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { Breadcrumb, SearchBar, ProductCardSkeleton } from '../components';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredPharmacies, setFeaturedPharmacies] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch featured products from API
    const fetchFeaturedData = async () => {
      const extractItems = (raw) => {
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.results)) return raw.results;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      };

      const toValidProducts = (items) =>
        items.filter((product) => (
          product &&
          typeof product === 'object' &&
          product.id &&
          product.name &&
          typeof product.price !== 'undefined'
        ));

      try {
        setLoading(true);
        setError(null);

        // Use shared API instance (handles baseURL + auth interceptors)
        const productsRes = await api.get('/products/featured/');
        const items = extractItems(productsRes?.data);
        const validProducts = toValidProducts(items);

        // Only take the first 4 products
        setFeaturedProducts(validProducts.slice(0, 4));
      } catch (error) {
        // Fallback: try generic products endpoint so the homepage can still render.
        try {
          const fallbackRes = await api.get('/products/');
          const fallbackItems = extractItems(fallbackRes?.data);
          const fallbackProducts = toValidProducts(fallbackItems).slice(0, 4);

          if (fallbackProducts.length > 0) {
            setFeaturedProducts(fallbackProducts);
            setError(null);
            return;
          }
        } catch (fallbackError) {
          if (import.meta.env.DEV) {
            console.error('[Home Debug] Fallback products request failed:', {
              message: fallbackError.message,
              status: fallbackError.response?.status,
              url: fallbackError.config?.url,
              response: fallbackError.response?.data,
            });
          }
        }

        if (import.meta.env.DEV) {
          console.error('[Home Debug] Error fetching featured data:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            baseURL: api.defaults.baseURL,
            response: error.response?.data,
          });
        }

        const status = error.response?.status;
        const serviceDown = [500, 502, 503, 504].includes(status);
        setError(
          serviceDown
            ? 'Featured products are temporarily unavailable while our service recovers.'
            : 'Unable to load featured products. Please try again later.'
        );
        setFeaturedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedData();
  }, []);

  const handleSearch = (query) => {
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-lg text-blue-600 dark:text-blue-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/30 dark:bg-gray-900">
      {/* Hero Section - Premium Indigo/Violet Gradient */}
      <section className="relative overflow-hidden pt-20 pb-40">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] -mr-96 -mt-96 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[100px] -ml-72 -mb-72"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-8">
              <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-indigo-100 dark:border-indigo-800 shadow-sm animate-fade-in">
                Next-Gen Pharmaceutical Network
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl font-display font-bold text-slate-900 dark:text-white mb-8 tracking-tight animate-fade-in leading-[1.1]">
              Precision care. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-300% animate-gradient-flow">Seamless access.</span>
            </h1>
            <p className="text-xl text-slate-500 dark:text-gray-400 mb-12 animate-slide-up font-medium leading-relaxed max-w-2xl mx-auto" style={{ animationDelay: '0.1s' }}>
              Your trusted partner for authentic medications. Fast delivery, secure payments, and professional care coordinated through our specialized registry.
            </p>

            {/* Premium Search Bar */}
            <div className="max-w-3xl mx-auto mb-16 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <SearchBar
                placeholder="Search for medicines, active compounds, or therapeutic categories..."
                onSearch={handleSearch}
                showFilters={true}
              />
            </div>

            <div className="flex flex-wrap justify-center gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Link
                to="/products"
                className="inline-flex items-center px-8 py-4 rounded-2xl bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-bold text-xs uppercase tracking-widest border border-slate-200 dark:border-gray-700 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm hover:shadow-premium"
              >
                Browse Registry
              </Link>
              <Link
                to="/upload-prescription"
                className="inline-flex items-center px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-200"
              >
                Submit Prescription
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products - Bento Layout */}
      <section className="py-24 px-4 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 w-10 bg-indigo-600 rounded-full"></div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em]">Popular</span>
              </div>
              <h2 className="text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                Featured <span className="text-slate-400 dark:text-gray-500">medicines</span>
              </h2>
            </div>
            <Link
              to="/products"
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all border border-slate-200/50 dark:border-gray-700"
            >
              View all products
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(4)].map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : error ? (
            <div className="glass-card rounded-[2.5rem] py-16 text-center border-rose-100 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-900/10">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <p className="text-rose-900 dark:text-rose-100 font-bold text-lg tracking-tight">{error}</p>
            </div>
          ) : (!Array.isArray(featuredProducts) || featuredProducts.length === 0) ? (
            <div className="text-center py-32 glass-card rounded-[3rem] border-dashed border-2 border-slate-200 dark:border-gray-700">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
                  <svg className="h-10 w-10 text-slate-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">No featured products right now</h3>
                <p className="mt-2 text-slate-500 dark:text-gray-400 font-medium">Featured products will show here. Check back soon or browse all products.</p>
                <Link to="/products" className="mt-10 inline-flex items-center px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-glow-indigo">
                  View all products
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group glass-card rounded-[2.5rem] p-4 border border-white/60 dark:border-gray-700 hover:shadow-premium transition-all duration-500 flex flex-col"
                >
                  <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-slate-50 dark:bg-gray-800 mb-6">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-200 dark:text-gray-600">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </div>
                    )}
                    <div className="absolute inset-x-4 bottom-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <Link
                        to={`/products/${product.id}`}
                        className="w-full bg-slate-900/90 dark:bg-gray-800/90 backdrop-blur-md text-white py-3 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-600 transition-colors text-center inline-block shadow-xl"
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                  <div className="px-4 pb-4 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] font-bold text-indigo-50 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-100 dark:border-indigo-800">
                        {product.category || 'Product'}
                      </span>
                    </div>
                    <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2 truncate">
                      {product.name}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-gray-400 mb-6 line-clamp-2 font-medium leading-relaxed">
                      {product.description || 'Product details.'}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50 dark:border-gray-700">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">Price / Unit</p>
                        <p className="text-xl font-display font-bold text-slate-900 dark:text-white">
                          <span className="text-sm font-medium text-slate-400 dark:text-gray-500 mr-1">KSh</span>
                          {product.price.toLocaleString()}
                        </p>
                      </div>
                      <button className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90 group">
                        <PlusIcon className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer or additional sections can be added here */}
    </div>
  );
};

export default Home;
