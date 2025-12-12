import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredPharmacies, setFeaturedPharmacies] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch featured products from API
    const fetchFeaturedData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[Home Debug] Fetching featured products from:', `${api.defaults.baseURL}/products/featured/`);

        // First check if the API is accessible
        try {
          await api.get('/health/');
        } catch (healthError) {
          console.error('[Home Debug] API health check failed:', {
            error: healthError.message,
            status: healthError.response?.status
          });
          // Don't throw here, still try to fetch products
        }

        // Use shared API instance (handles baseURL + auth interceptors)
        const productsRes = await api.get(`/products/featured/`);

        console.log('[Home Debug] Featured products response:', {
          status: productsRes.status,
          headers: productsRes.headers,
          data: productsRes.data
        });

        // Safely extract and validate products data
        const raw = productsRes?.data;
        let items = [];

        if (Array.isArray(raw)) {
          items = raw;
        } else if (Array.isArray(raw?.results)) {
          items = raw.results;
        } else if (Array.isArray(raw?.data)) {
          items = raw.data;
        } else {
          console.warn('[Home Debug] Unexpected response format:', raw);
        }

        // Validate each product has required fields
        const validProducts = items.filter(product => (
          product &&
          typeof product === 'object' &&
          product.id &&
          product.name &&
          typeof product.price !== 'undefined'
        ));

        console.log('[Home Debug] Valid featured products:', validProducts);

        // Only take the first 4 products
        setFeaturedProducts(validProducts.slice(0, 4));
      } catch (error) {
        console.error("[Home Debug] Error fetching featured data:", {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          baseURL: api.defaults.baseURL,
          response: error.response?.data,
        });
        setError("Unable to load featured products. Please try again later.");
        setFeaturedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeaturedData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-blue-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-50 pt-16 pb-32">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-200 blur-3xl opacity-50 animate-float"></div>
          <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-secondary-200 blur-3xl opacity-50 animate-float" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight animate-fade-in">
              Healthcare <span className="text-primary-500">Simplified</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Your trusted partner for authentic medications. Fast delivery, secure payments, and professional care right at your doorstep.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative group">
                <div className="absolute inset-0 bg-primary-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative flex bg-white rounded-2xl shadow-soft overflow-hidden border border-slate-100 p-2">
                  <input
                    type="text"
                    placeholder="Search for medicines, brands, or categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-6 py-3 text-slate-700 placeholder-slate-400 focus:outline-none text-lg bg-transparent"
                  />
                  <button
                    type="submit"
                    className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg shadow-primary-500/30"
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>

            <div className="flex justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Link
                to="/products"
                className="inline-flex items-center px-6 py-3 rounded-xl bg-white text-slate-700 font-semibold border border-slate-200 hover:border-primary-500 hover:text-primary-600 transition-all shadow-sm hover:shadow-md"
              >
                Browse Catalog
              </Link>
              <Link
                to="/upload-prescription"
                className="inline-flex items-center px-6 py-3 rounded-xl bg-secondary-50 text-secondary-600 font-semibold hover:bg-secondary-100 transition-all"
              >
                Upload Prescription
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                Featured Products
              </h2>
              <p className="text-slate-500">Curated selection of our best-selling items</p>
            </div>
            <Link
              to="/products"
              className="hidden sm:inline-flex items-center text-primary-600 font-semibold hover:text-primary-700 transition-colors"
            >
              View All
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          {loading ? (
            // Loading state with skeleton
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-pulse">
                  <div className="aspect-w-1 aspect-h-1 bg-slate-100" />
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-8 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-12">
              <div className="inline-flex items-center px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          ) : (!Array.isArray(featuredProducts) || featuredProducts.length === 0) ? (
            // Empty state
            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="max-w-md mx-auto">
                <svg className="mx-auto h-24 w-24 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-6 text-xl font-semibold text-slate-900">No Featured Products Yet</h3>
                <p className="mt-2 text-slate-500">
                  We're currently curating our featured products collection.
                </p>
                <div className="mt-8">
                  <Link
                    to="/products"
                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-all"
                  >
                    Browse All Products
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            // Products grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {(Array.isArray(featuredProducts) ? featuredProducts : []).map((product) => (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-card transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="relative aspect-w-1 aspect-h-1 bg-slate-50 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-300">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
                      <Link
                        to={`/products/${product.id}`}
                        className="w-full bg-white text-slate-900 py-2 rounded-lg font-semibold text-sm hover:bg-primary-50 transition-colors text-center shadow-lg"
                      >
                        Quick View
                      </Link>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mb-2">
                      <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                        {product.category || 'Medicine'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                      {product.description || 'No description available.'}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold text-slate-900">
                        KSh {product.price.toLocaleString()}
                      </p>
                      <button className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-primary-500 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12 sm:hidden">
            <Link
              to="/products"
              className="inline-flex items-center px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Browse All Products
            </Link>
          </div>
        </div>
      </section>

      {/* Footer or additional sections can be added here */}
    </div>
  );
};

export default Home;
