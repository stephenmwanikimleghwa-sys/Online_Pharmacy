import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";

const Cart = () => {
  const {
    items: cartItems,
    removeFromCart,
    updateQuantity,
  } = useContext(CartContext);

  const total = (cartItems || []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  if ((cartItems || []).length === 0) {
    return (
      <div className="page-bg py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Your Cart is Empty
            </h1>
            <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
              Add some products to get started.
            </p>
            <Link
              to="/products"
              className="btn-primary text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 table-header-row">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Shopping Cart</h1>
          </div>

          <div>
            {cartItems.map((item) => (
              <div key={item.id} className="flex py-6 px-6" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border" style={{ borderColor: 'var(--border-primary)' }}>
                  <img
                    src={item.image || "/placeholder-product.jpg"}
                    alt={item.name}
                    className="h-full w-full object-cover object-center"
                  />
                </div>

                <div className="ml-4 flex flex-1 flex-col">
                  <div>
                    <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      <Link
                        to={`/products/${item.id}`}
                        style={{ color: 'inherit' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-highlight)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}
                      >
                        {item.name}
                      </Link>
                    </h3>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {item.pharmacy}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col justify-end sm:flex-row sm:justify-between">
                    <div className="flex items-center">
                      <label
                        htmlFor={`quantity-${item.id}`}
                        className="text-sm font-medium mr-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Qty:
                      </label>
                      <select
                        id={`quantity-${item.id}`}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.id, parseInt(e.target.value))
                        }
                        className="form-input !py-1 !px-2 !w-auto text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-sm font-medium mt-2 sm:mt-0" style={{ color: 'var(--text-primary)' }}>
                      KES {item.price * item.quantity}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="font-medium ml-4 text-rose-600 hover:text-rose-500 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="px-6 py-6" style={{ borderTop: '1px solid var(--border-primary)', background: 'var(--bg-field)' }}>
            <div className="flex justify-between text-base font-medium">
              <p style={{ color: 'var(--text-primary)' }}>Total</p>
              <p style={{ color: 'var(--text-primary)' }}>KES {total.toLocaleString()}</p>
            </div>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Shipping and taxes calculated at checkout.
            </p>
            <div className="mt-6 flex justify-center space-x-4">
              <Link
                to="/products"
                className="text-center text-sm font-medium transition-colors"
                style={{ color: 'var(--color-primary)' }}
              >
                Continue Shopping
                <span aria-hidden="true"> &rarr;</span>
              </Link>
              <Link
                to="/checkout"
                className="btn-primary text-white font-bold py-3 px-6 rounded-lg text-center"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
