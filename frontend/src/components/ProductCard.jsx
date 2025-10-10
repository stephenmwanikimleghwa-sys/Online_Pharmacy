import React from 'react';
import { HeartIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

const ProductCard = ({ product, onAddToCart }) => {
  const { id, name, price, image, pharmacy, category } = product;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
      {/* Product Image */}
      <div className="relative h-48 bg-gray-100">
        <img
          src={image || '/placeholder-product.jpg'}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button className="p-2 bg-white rounded-full shadow-md hover:bg-gray-50">
            <HeartIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4">
        {/* Category Badge */}
        <span className="inline-block px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full mb-2">
          {category}
        </span>

        {/* Product Name */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
          {name}
        </h3>

        {/* Pharmacy Name */}
        <p className="text-sm text-gray-600 mb-3">
          By {pharmacy?.name || 'Pharmacy'}
        </p>

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold text-blue-600">
            KSh {price.toLocaleString()}
          </span>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={() => onAddToCart(product)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
        >
          <ShoppingCartIcon className="w-5 h-5" />
          Add to Cart
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
