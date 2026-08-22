import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ImageWithFallback from "../components/ImageWithFallback";
import api from '../services/api';
import PageLoader from '../components/PageLoader';
import PageHeader from '../components/PageHeader';
import { getProductDisplayPrice } from '../utils/parseApiData';

const ProductDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await api.get(`/products/${id}/`);
        setProduct(response.data);
      } catch (err) {
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return <PageLoader />;
  }

  if (error || !product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          {error || 'Product not found'}
        </p>
        <Link to="/products" className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
          Back to catalogue
        </Link>
      </div>
    );
  }

  const pharmacy = product.pharmacy || {};
  const role = user?.role;
  const canSell = role === 'admin' || role === 'pharmacist' || role === 'cashier';
  const canManageStock = role === 'admin' || role === 'pharmacist';

  return (
    <div className="py-8 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          eyebrow="Catalogue"
          title={product.name}
          description={product.description || undefined}
          actions={
            <Link to="/products" className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              ← All products
            </Link>
          }
        />

        <div className="glass-card overflow-hidden" style={{ borderRadius: 'var(--radius-surface)' }}>
          <div className="md:flex">
            <div className="md:w-2/5 p-6" style={{ background: 'var(--bg-field)' }}>
              <ImageWithFallback
                src={product.image}
                alt={product.name}
                fallbackText={product.name}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>

            <div className="md:w-3/5 p-6 md:p-8">
              {product.category && (
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-primary)' }}>
                  {product.category}
                </p>
              )}

              <p className="text-2xl font-display font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                <span className="text-sm font-medium mr-1" style={{ color: 'var(--text-secondary)' }}>KSh</span>
                {getProductDisplayPrice(product).toLocaleString()}
              </p>

              {typeof product.stock_quantity !== 'undefined' && (
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Stock:{' '}
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {product.total_stock ?? product.stock_quantity}
                  </span>
                </p>
              )}

              {pharmacy.name && (
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Branch: <span style={{ color: 'var(--text-primary)' }}>{pharmacy.name}</span>
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                {canSell && (
                  <Link
                    to="/otc-sales"
                    className="btn-primary px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
                  >
                    Sell via OTC
                  </Link>
                )}
                {canManageStock && (
                  <Link
                    to="/inventory/management"
                    className="form-cancel-btn px-5 py-2.5 rounded-lg text-sm font-semibold"
                  >
                    Open inventory
                  </Link>
                )}
              </div>

              {(pharmacy.address || pharmacy.phone_number) && (
                <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border-primary)' }}>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    Branch details
                  </h3>
                  {pharmacy.address && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{pharmacy.address}</p>
                  )}
                  {pharmacy.phone_number && (
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Phone: {pharmacy.phone_number}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
