import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { unwrapList } from '../utils/parseApiData';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import ProductCard from '../components/ProductCard';
import { Breadcrumb, SearchBar, ProductCardSkeleton, TableSkeleton } from '../components';
import {
  FunnelIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const Products = () => {
  const { notify } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = useAuth();
  const { addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const categories = [
    { value: 'pain_relief', label: 'Pain Relief', icon: '💊' },
    { value: 'antibiotics', label: 'Antibiotics', icon: '🧬' },
    { value: 'vitamins', label: 'Vitamins & Supplements', icon: '💪' },
    { value: 'chronic_care', label: 'Chronic Care', icon: '🏥' },
    { value: 'dermatology', label: 'Dermatology', icon: '🧴' },
    { value: 'other', label: 'Other', icon: '📦' }
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'newest', label: 'Newest' },
    { value: 'rating', label: 'Rating' }
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/products/', {
          params: { context: 'store', page_size: 5000 },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          skipGlobalErrorNotification: true,
        });

        setProducts(unwrapList(response.data));
      } catch (err) {
        setError(err?.response?.data?.message || err.message || 'Failed to fetch products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [token]);

  const filteredProducts = products
    .filter(product => {
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesSearch = !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      const matchesStock = !inStockOnly || (product.stock_quantity || 0) > 0;

      return matchesCategory && matchesSearch && matchesPrice && matchesStock;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'price') {
        comparison = a.price - b.price;
      } else if (sortBy === 'newest') {
        comparison = new Date(b.created_at || 0) - new Date(a.created_at || 0);
      } else if (sortBy === 'rating') {
        comparison = (b.rating || 0) - (a.rating || 0);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleAddToCart = (product) => {
    addToCart(product);
    notify.info('Added to Cart', `${product.name} was added to your cart.`);
  };

  const handleSearch = (query) => {
    setSearchTerm(query);
    if (query) {
      setSearchParams({ search: query });
    } else {
      setSearchParams({});
    }
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setPriceRange([0, 10000]);
    setInStockOnly(false);
    setSearchTerm('');
    setSearchParams({});
  };

  const hasActiveFilters = selectedCategory || inStockOnly || searchTerm;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        <div className="alert-error mb-8 p-4 rounded-2xl flex items-center gap-4 animate-shake">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--color-danger-rgb,239,68,68),0.15)', color: '#ef4444' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="text-rose-900 font-bold text-sm tracking-tight">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-12 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-glow">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Browse <span className="text-primary">Products</span></h1>
          </div>
          <p className="text-lg text-slate-500 font-medium">
            Browse our collection of quality pharmaceutical products.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex p-1.5 rounded-2xl border" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-primary shadow-premium'
                  : 'hover:text-slate-600'
              }`}
              style={viewMode !== 'grid' ? { color: 'var(--text-muted)' } : {}}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-primary shadow-premium'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="form-input px-5 py-3 text-sm font-bold focus:outline-none focus:ring-4 appearance-none pr-10 transition-all"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  Sort by {option.label}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              {sortOrder === 'asc' ? (
                <ArrowUpIcon className="h-4 w-4" />
              ) : (
                <ArrowDownIcon className="h-4 w-4" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card rounded-[2rem] p-8 border border-white/60 shadow-premium mb-10">
        <SearchBar
          placeholder="Search medicines by name, category, or description..."
          onSearch={handleSearch}
          showFilters={true}
          filterOptions={{
            categories: categories.map(cat => ({
              id: cat.value,
              label: cat.label,
              value: cat.value
            })),
            priceRanges: [
              { id: 'under-500', label: 'Under KSh 500', value: '0-500' },
              { id: '500-1000', label: 'KSh 500 - 1,000', value: '500-1000' },
              { id: '1000-5000', label: 'KSh 1,000 - 5,000', value: '1000-5000' },
              { id: 'over-5000', label: 'Over KSh 5,000', value: '5000+' }
            ]
          }}
        />
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Active filters:</span>
          {selectedCategory && (
            <span className="brand-mist inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest">
              {categories.find(c => c.value === selectedCategory)?.label}
              <button onClick={() => setSelectedCategory('')} className="hover:text-indigo-900 transition-colors">
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {inStockOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', borderColor: 'rgba(16,185,129,0.2)' }}>
              In Stock Only
              <button onClick={() => setInStockOnly(false)} className="hover:text-emerald-900 transition-colors">
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {searchTerm && (
            <span className="data-cell inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm">
              "{searchTerm}"
              <button
                onClick={() => { setSearchTerm(''); setSearchParams({}); }}
                className="hover:text-slate-900 transition-colors"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          <button
            onClick={clearFilters}
            className="text-[10px] font-bold text-primary uppercase tracking-widest hover:text-primary transition-colors px-3 py-1.5"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-card rounded-[2.5rem] border border-white/60 shadow-premium py-24 flex flex-col items-center justify-center text-center px-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6" style={{ background: 'var(--bg-field)' }}>
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>No products found</h3>
          <p className="mt-2 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            Try adjusting your filters or search terms.
          </p>
          <button
            onClick={clearFilters}
            className="mt-8 px-6 py-3.5 btn-primary text-white rounded-2xl  shadow-premium hover:shadow-glow transition-all active:scale-[0.98] flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
          >
            <FunnelIcon className="h-5 w-5" />
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Showing <span style={{ color: 'var(--text-primary)' }}>{filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}</span>
              </p>
            </div>
          </div>

          <div className={`grid gap-6 ${
            viewMode === 'grid'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-1'
          }`}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Products;
