import React from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';
import ImageWithFallback from './ImageWithFallback';

const ProductCard = ({ product }) => {
  const { id, name, price, image, pharmacy, category } = product;

  return (
    <div className="glass-card overflow-hidden group" style={{ borderRadius: '16px' }}>
      {/* Product Image */}
      <div className="relative h-48" style={{ background: 'var(--bg-field)' }}>
        <ImageWithFallback
          src={image}
          alt={name}
          fallbackText={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            className="p-2 rounded-full shadow-md transition-colors"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
            }}
          >
            <HeartIcon className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
          </button>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4">
        {/* Category Badge */}
        <span className="inline-block px-2 py-1 text-xs font-semibold category-pill rounded-full mb-2">
          {category}
        </span>

        {/* Product Name */}
        <h3
          className="text-lg font-semibold mb-1 leading-snug break-words"
          style={{ color: 'var(--text-primary)' }}
        >
          {name}
        </h3>

        {/* Pharmacy Name */}
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          By {pharmacy?.name || 'Pharmacy'}
        </p>

        {/* Price */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
            KSh {price.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
