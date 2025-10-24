import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredPharmacies, setFeaturedPharmacies] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch featured products from API
    const fetchFeaturedData = async () => {
      try {
        // Replace with actual API endpoints
        const productsRes = await axios.get(`${API_BASE_URL}/products/featured/`);
        const raw = productsRes?.data;
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        setFeaturedProducts(items.slice(0, 8)); // Top 8
      } catch (error) {
        console.error("Error fetching featured data:", error);
        // Mock data for development
        setFeaturedProducts([
          {
            id: 1,
            name: "Paracetamol 500mg",
            price: 50,
            category: "Pain Relief",
          },
          {
            id: 2,
            name: "Amoxicillin 250mg",
            price: 120,
            category: "Antibiotics",
          },
          // Add more mock data
        ]);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 mb-4">{product.category}</p>
                  <p className="text-2xl font-bold text-green-600 mb-4">
                    KSh {product.price}
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
          <div className="text-center mt-8">
            <Link
              to="/products"
              className="text-blue-600 hover:text-blue-800 font-semibold"
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
