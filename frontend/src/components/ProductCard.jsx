import React from 'react';
import { Link } from 'react-router-dom';
import ImageWithFallback from './ImageWithFallback';
import { getProductDisplayPrice } from '../utils/parseApiData';

const ProductCard = ({ product }) => {
  const { id, name, image, pharmacy, category, stock_quantity, total_stock } = product;
  const displayPrice = getProductDisplayPrice(product);
  const stock = Number(total_stock ?? stock_quantity);
  const hasStock = Number.isFinite(stock);

  return (
    <Link
      to={`/products/${id}`}
      className="glass-card overflow-hidden group block transition-shadow hover:shadow-premium"
      style={{ borderRadius: 'var(--radius-surface)' }}
    >
      <div className="relative h-44" style={{ background: 'var(--bg-field)' }}>
        <ImageWithFallback
          src={image}
          alt={name}
          fallbackText={name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
      </div>

      <div className="p-4">
        {category && (
          <span
            className="inline-block px-2 py-0.5 text-xs font-medium rounded-md mb-2"
            style={{ background: 'var(--brand-mist)', color: 'var(--color-primary)' }}
          >
            {category}
          </span>
        )}

        <h3
          className="text-base font-display font-semibold mb-1 leading-snug break-words"
          style={{ color: 'var(--text-primary)' }}
        >
          {name}
        </h3>

        {pharmacy?.name && (
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            {pharmacy.name}
          </p>
        )}

        <div className="flex items-end justify-between gap-2">
          <span className="text-lg font-display font-bold" style={{ color: 'var(--text-primary)' }}>
            <span className="text-xs font-medium mr-0.5" style={{ color: 'var(--text-secondary)' }}>KSh</span>
            {displayPrice.toLocaleString()}
          </span>
          {hasStock && (
            <span
              className="text-xs font-medium"
              style={{ color: stock > 0 ? 'var(--text-secondary)' : '#b91c1c' }}
            >
              {stock > 0 ? `${stock} in stock` : 'Out of stock'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
