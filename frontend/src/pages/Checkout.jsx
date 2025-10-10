import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';

const Checkout = () => {
  const { cartItems, clearCart, getCartTotal } = useContext(CartContext);
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const total = getCartTotal();

  const [address, setAddress] = useState({
    fullName: user?.full_name || '',
    phoneNumber: user?.phone_number || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    county: '',
    postalCode: ''
  });

  const [paymentMethod, setPaymentMethod] = useState('mpesa'); // 'mpesa' or 'stripe'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

  const handleAddressChange = (e) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please log in to complete checkout.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Create order on backend
      const orderData = {
        items: cartItems,
        shipping_address: address,
        total_amount: total,
        payment_method: paymentMethod
      };

      const response = await axios.post('/api/orders/', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const orderId = response.data.id;

      // Step 2: Initiate payment based on method
      if (paymentMethod === 'mpesa') {
        // M-Pesa integration stub - In real app, use Daraja API
        const mpesaResponse = await axios.post('/api/payments/mpesa/initiate/', {
          order_id: orderId,
          amount: total,
          phone_number: address.phoneNumber
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Redirect to M-Pesa STK push or show phone prompt
        alert(`M-Pesa payment initiated. Check your phone for PIN prompt. Reference: ${mpesaResponse.data.checkout_request_id}`);

        // Poll for payment confirmation or use callback
        // For demo, assume success after delay
        setTimeout(() => {
          handlePaymentSuccess(orderId);
        }, 3000);

      } else if (paymentMethod === 'stripe') {
        const stripe = await stripePromise;
        const { data: { client_secret } } = await axios.post('/api/payments/stripe/create-payment-intent/', {
          order_id: orderId,
          amount: total * 100 // Stripe uses cents
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const { error: stripeError } = await stripe.confirmCardPayment(client_secret, {
          payment_method: {
            card: {
              number: '4242424242424242', // Test card for demo
              exp_month: 12,
              exp_year: 2024,
              cvc: '123'
            }
          }
        });

        if (stripeError) {
          setError(stripeError.message);
        } else {
          handlePaymentSuccess(orderId);
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (orderId) => {
    // Update order status on backend
    await axios.patch(`/api/orders/${orderId}/`, { status: 'completed' }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    clearCart();
    navigate('/order-confirmation', { state: { orderId } });
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-blue-600">Your cart is empty</h1>
          <p className="mt-2 text-gray-600">Add items to cart to proceed with checkout.</p>
          <button
            onClick={() => navigate('/products')}
            className="mt-4 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-3xl font-bold text-blue-600 mb-6">Checkout</h1>

          {/* Order Summary */}
          <div className="mb-6 p-4 bg-gray-100 rounded-md">
            <h2 className="text-xl font-semibold mb-2">Order Summary</h2>
            <ul className="space-y-2">
              {cartItems.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>{item.name} x {item.quantity}</span>
                  <span>KSh {item.price * item.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="border-t pt-2 mt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>KSh {total}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  value={address.fullName}
                  onChange={handleAddressChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="tel"
                  name="phoneNumber"
                  placeholder="Phone Number"
                  value={address.phoneNumber}
                  onChange={handleAddressChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  name="addressLine1"
                  placeholder="Address Line 1"
                  value={address.addressLine1}
                  onChange={handleAddressChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 md:col-span-2"
                  required
                />
                <input
                  type="text"
                  name="addressLine2"
                  placeholder="Address Line 2 (Optional)"
                  value={address.addressLine2}
                  onChange={handleAddressChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 md:col-span-2"
                />
                <input
                  type="text"
                  name="city"
                  placeholder="City"
                  value={address.city}
                  onChange={handleAddressChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  name="county"
                  placeholder="County"
                  value={address.county}
                  onChange={handleAddressChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  name="postalCode"
                  placeholder="Postal Code"
                  value={address.postalCode}
                  onChange={handleAddressChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Payment Method</h2>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="mpesa"
                    checked={paymentMethod === 'mpesa'}
                    onChange={() => handlePaymentMethodChange('mpesa')}
                    className="mr-2"
                  />
                  <span className="text-lg">M-Pesa (Mobile Money)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="stripe"
                    checked={paymentMethod === 'stripe'}
                    onChange={() => handlePaymentMethodChange('stripe')}
                    className="mr-2"
                  />
                  <span className="text-lg">Credit/Debit Card (Stripe)</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Processing...' : `Pay KSh ${total} Now`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
