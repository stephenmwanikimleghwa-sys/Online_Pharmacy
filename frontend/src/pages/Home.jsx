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
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Welcome to Transcounty Pharmacy
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Your trusted online pharmacy in Kenya. Essential medications with
            fast, secure, and convenient delivery at your doorstep.
          </p>
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-md mx-auto mb-8">
            <div className="flex bg-white rounded-lg shadow-lg overflow-hidden">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 text-gray-700 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-600 px-6 py-3 text-white font-semibold transition-colors"
              >
                Search
              </button>
            </div>
          </form>
          <Link
            to="/products"
            className="inline-block bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Featured Products
          </h2>
          
          {loading ? (
            // Loading state with skeleton
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200" />
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                    <div className="h-10 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-8">
              <div className="inline-flex items-center px-4 py-2 rounded-md bg-red-50 text-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          ) : featuredProducts.length === 0 ? (
            // Empty state with illustration and CTA
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <svg className="mx-auto h-24 w-24 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Featured Products Yet</h3>
                <p className="mt-2 text-gray-500">
                  We're currently curating our featured products collection.
                  Check back soon or browse our complete catalog.
                </p>
                <div className="mt-6">
                  <Link
                    to="/products"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Browse All Products
                    <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 -mr-1 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            // Products grid
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {product.image && (
                    <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {product.name}
                    </h3>
                    {product.category && (
                      <p className="text-gray-600 mb-4">{product.category}</p>
                    )}
                    <p className="text-2xl font-bold text-green-600 mb-4">
                      KSh {product.price.toLocaleString()}
                    </p>
                    <Link
                      to={`/products/${product.id}`}
                      className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 rounded-lg font-semibold transition-colors"
                    >
                      View Product
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Always show "Browse All" link */}
          <div className="text-center mt-8">
            <Link
              to="/products"
              className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-md font-semibold transition-colors"
            >
              Browse All Products
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer or additional sections can be added here */}
    </div>
  );
};

export default Home;
