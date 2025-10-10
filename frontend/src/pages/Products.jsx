import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart();
  const { token } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('/api/products/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProducts(response.data);
      } catch (err) {
        setError('Failed to load products');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [token]);

  if (loading) return <div className="p-8 text-center">Loading products...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white rounded-lg shadow-md p-4">
            <img src={product.image || '/placeholder.jpg'} alt={product.name} className="w-full h-48 object-cover rounded mb-4" />
            <h2 className="text-xl font-semibold mb-2">{product.name}</h2>
            <p className="text-gray-600 mb-2">{product.description}</p>
            <p className="text-2xl font-bold text-green-600 mb-4">KES {product.price}</p>
            <div className="flex space-x-2">
              <Link to={`/products/${product.id}`} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded text-center hover:bg-blue-700">
                View Details
              </Link>
              <button
                onClick={() => addToCart(product)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded text-center hover:bg-green-700"
              >
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
      {products.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No products available. Check back later!</p>
        </div>
      )}
    </div>
  );
};

export default Products;
