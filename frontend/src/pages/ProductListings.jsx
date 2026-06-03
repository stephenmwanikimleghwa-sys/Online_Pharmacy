import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const ProductListings = () => {
  const { pharmacyId } = useParams();
  const { notify } = useNotification();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityMap, setAvailabilityMap] = useState({});

  useEffect(() => {
    fetchProducts();
  }, [pharmacyId]);

  const fetchProducts = async () => {
    try {
      // Use context=store for public/unauthenticated users to get stock-aware filtering
      const response = await api.get(`/products/?context=store&page_size=100`);
      setProducts(response.data.results || response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load products');
      setLoading(false);
    }
  };

  // Get stock quantity for a product (if we have branch_stocks data)
  const getProductStockQuantity = (product) => {
    if (!product.branch_stocks || product.branch_stocks.length === 0) {
      return 0;
    }
    // Sum all branch stocks for availability badge
    return product.branch_stocks.reduce((sum, bs) => sum + (bs.quantity || 0), 0);
  };

  // Fetch availability across all branches when product is out of stock
  const fetchAvailability = async (productId) => {
    try {
      const response = await api.get(`/products/${productId}/availability/`);
      setAvailabilityMap(prev => ({
        ...prev,
        [productId]: response.data
      }));
      
      // Show available branches if product is out of stock locally
      const availableBranches = response.data.branches
        .filter(b => b.quantity > 0 && !b.is_active_branch);
      
      if (availableBranches.length > 0) {
        const branches = availableBranches.map(b => `${b.branch} (${b.quantity} units)`).join(', ');
        notify.info('Available at', `This product is available at: ${branches}`);
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
    }
  };

  // Stock badge component
  const stockBadge = (qty) => {
    if (qty <= 0) return null;
    if (qty <= 5) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
          Only {qty} left
        </span>
      );
    }
    if (qty <= 20) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
          {qty} in stock
        </span>
      );
    }
    return null;
  };

  // Out of stock badge
  const outOfStockBadge = () => (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
      Out of Stock
    </span>
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>;
  if (error) return <div className="text-red-500 text-center">{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Products</h1>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:ring-2  focus:border-transparent"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const totalStock = getProductStockQuantity(product);
            const isOutOfStock = totalStock === 0;
            
            return (
              <div
                key={product.id}
                className={`glass-card overflow-hidden hover:shadow-lg transition-shadow duration-200 ${
                  isOutOfStock ? 'opacity-60' : ''
                }`}
              >
                <Link to={`/products/${product.id}`} className="block">
                  <div className="relative">
                    <img
                      src={product.image || '/placeholder.jpg'}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                    {/* Stock badge */}
                    <div className="absolute top-2 right-2">
                      {isOutOfStock ? outOfStockBadge() : stockBadge(totalStock)}
                    </div>
                  </div>
                </Link>
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <p className="text-gray-600 mb-2">{product.category}</p>
                  <p className="text-2xl font-bold text-green-600 mb-4">KSh {product.price}</p>
                  
                  {/* Stock information */}
                  <div className="mb-4">
                    {isOutOfStock ? (
                      <p className="text-sm text-gray-500">Out of stock at all branches</p>
                    ) : (
                      <p className="text-sm text-green-600 font-medium">{totalStock} units available</p>
                    )}
                  </div>

                  <Link
                    to={`/products/${product.id}`}
                    className="w-full btn-primary text-white py-2 px-4 rounded-md transition-colors block text-center"
                  >
                    View Details
                  </Link>
                  
                  {/* Availability button for out-of-stock items */}
                  {isOutOfStock && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        fetchAvailability(product.id);
                      }}
                      className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md transition-colors text-sm font-medium"
                    >
                      Check Other Branches
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No products found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductListings;
