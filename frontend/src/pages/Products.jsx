import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { unwrapList } from '../utils/parseApiData';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import PageHeader from '../components/PageHeader';
import { SearchBar, ProductCardSkeleton } from '../components';
import {
  FunnelIcon,
  XMarkIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { token } = useAuth();

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
    { value: 'pain_relief', label: 'Pain relief' },
    { value: 'antibiotics', label: 'Antibiotics' },
    { value: 'vitamins', label: 'Vitamins & supplements' },
    { value: 'chronic_care', label: 'Chronic care' },
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'other', label: 'Other' },
  ];

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'newest', label: 'Newest' },
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
    .filter((product) => {
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
      const matchesStock = !inStockOnly || (product.stock_quantity || 0) > 0;
      return matchesCategory && matchesSearch && matchesPrice && matchesStock;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'price') {
        comparison = a.price - b.price;
      } else if (sortBy === 'newest') {
        comparison = new Date(b.created_at || 0) - new Date(a.created_at || 0);
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
        <div className="alert-error mb-8 p-4 rounded-xl flex items-center gap-4">
          <p className="text-sm font-medium">
            {typeof error === 'string' ? error : error?.message || 'Something went wrong'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <PageHeader
        title="Product catalogue"
        description="Search and review medicines available to your branch."
        actions={
          <div className="flex p-1 rounded-lg border" style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)' }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-md text-xs font-semibold transition-all ${viewMode === 'grid' ? 'btn-primary text-white' : ''}`}
              style={viewMode === 'grid' ? {} : { color: 'var(--text-secondary)' }}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-md text-xs font-semibold transition-all ${viewMode === 'list' ? 'btn-primary text-white' : ''}`}
              style={viewMode === 'list' ? {} : { color: 'var(--text-secondary)' }}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              List
            </button>
          </div>
        }
      />

      <div className="mb-6">
        <SearchBar
          placeholder="Search medicines…"
          onSearch={handleSearch}
          showFilters={false}
        />
      </div>

      <div
        className="glass-card p-5 mb-6 border"
        style={{ borderRadius: 'var(--radius-surface)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${!selectedCategory ? 'btn-primary text-white border-transparent' : ''}`}
                style={
                  !selectedCategory
                    ? {}
                    : { background: 'var(--bg-field)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' }
                }
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${selectedCategory === cat.value ? 'btn-primary text-white border-transparent' : ''}`}
                  style={
                    selectedCategory === cat.value
                      ? {}
                      : { background: 'var(--bg-field)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' }
                  }
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Sort
              </label>
              <div className="flex items-center gap-1">
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSort(opt.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1 ${sortBy === opt.value ? 'border-transparent' : ''}`}
                    style={
                      sortBy === opt.value
                        ? { background: 'var(--brand-mist)', color: 'var(--color-primary)', borderColor: 'var(--brand-border-soft)' }
                        : { background: 'var(--bg-field)', color: 'var(--text-secondary)', borderColor: 'var(--border-primary)' }
                    }
                  >
                    {opt.label}
                    {sortBy === opt.value &&
                      (sortOrder === 'asc' ? <ArrowUpIcon className="w-3.5 h-3.5" /> : <ArrowDownIcon className="w-3.5 h-3.5" />)}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border cursor-pointer"
              style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
            >
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded"
              />
              In stock only
            </label>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Filters:
          </span>
          {selectedCategory && (
            <span className="brand-mist inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold">
              {categories.find((c) => c.value === selectedCategory)?.label || selectedCategory}
              <button type="button" onClick={() => setSelectedCategory('')} aria-label="Remove category filter">
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {inStockOnly && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', borderColor: 'rgba(16,185,129,0.2)' }}
            >
              In stock only
              <button type="button" onClick={() => setInStockOnly(false)} aria-label="Remove stock filter">
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {searchTerm && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ background: 'var(--bg-field)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              “{searchTerm}”
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSearchParams({});
                }}
                aria-label="Clear search"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold px-3 py-1.5"
            style={{ color: 'var(--color-primary)' }}
          >
            Clear all
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div
          className="glass-card py-20 flex flex-col items-center justify-center text-center px-8 border"
          style={{ borderRadius: 'var(--radius-surface)', borderColor: 'var(--border-primary)' }}
        >
          <h3 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            No products found
          </h3>
          <p className="mt-2 text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            Try adjusting your filters or search terms.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 px-5 py-2.5 btn-primary text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2"
          >
            <FunnelIcon className="h-4 w-4" />
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Showing{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {filteredProducts.length}
            </span>{' '}
            product{filteredProducts.length !== 1 ? 's' : ''}
          </p>

          <div
            className={`grid gap-5 ${
              viewMode === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Products;
