// import React, { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { useCart } from '../context/CartContext';
// import api from '../services/api'; // Axios instance for API calls
// import ReviewForm from '../components/ReviewForm';
// import ReviewList from '../components/ReviewList';
// 
// const ProductDetails = () => {
//   const { id } = useParams();
//   const { user } = useAuth();
//   const { addToCart } = useCart();
//   const [product, setProduct] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [quantity, setQuantity] = useState(1);
// 
//   useEffect(() => {
//     const fetchProduct = async () => {
//       try {
//         const response = await api.get(`/api/products/${id}/`);
//         setProduct(response.data);
//       } catch (err) {
//         setError('Failed to load product details');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
// 
//     fetchProduct();
//   }, [id]);
// 
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-100">
//         <div className="text-blue-600 text-xl">Loading product...</div>
//       </div>
//     );
//   }
// 
//   if (error || !product) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-100">
//         <div className="text-red-600 text-xl">{error || 'Product not found'}</div>
//       </div>
//     );
//   }
// 
//   const handleAddToCart = () => {
//     addToCart({ ...product, quantity });
//     // Optional: Show success message
//   };
// 
//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="bg-white rounded-lg shadow-md overflow-hidden">
//           <div className="md:flex">
//             {/* Product Image */}
//             <div className="md:w-1/2 p-6">
//               <img
//                 src={product.image || '/placeholder-product.jpg'}
//                 alt={product.name}
//                 className="w-full h-64 object-cover rounded-lg"
//               />
//             </div>
// 
//             {/* Product Details */}
//             <div className="md:w-1/2 p-6">
//               <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
//               <p className="text-gray-600 mb-4">{product.description}</p>
//               <p className="text-2xl font-semibold text-blue-600 mb-4">KSh {product.price}</p>
//               <p className="text-sm text-gray-500 mb-4">Category: {product.category}</p>
//               <p className="text-sm text-gray-500 mb-6">Available at: {product.pharmacy.name}</p>
// 
//               {/* Quantity Selector */}
//               <div className="flex items-center mb-6">
//                 <label className="mr-4 text-sm font-medium text-gray-700">Quantity:</label>
//                 <input
//                   type="number"
//                   min="1"
//                   value={quantity}
//                   onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value)))}
//                   className="w-16 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
// 
//               {/* Add to Cart Button */}
//               <button
//                 onClick={handleAddToCart}
//                 className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 mb-6"
//               >
//                 Add to Cart
//               </button>
// 
//               {/* Pharmacy Info */}
//               <div className="border-t pt-4">
//                 <h3 className="text-lg font-semibold text-gray-900 mb-2">Pharmacy Details</h3>
//                 <p className="text-gray-600">{product.pharmacy.address}</p>
//                 <p className="text-gray-600">Phone: {product.pharmacy.phone_number}</p>
//               </div>
//             </div>
//           </div>
// 
//           {/* Reviews Section */}
//           <div className="p-6 border-t">
//             <h2 className="text-2xl font-bold text-gray-900 mb-4">Reviews</h2>
//             {user && <ReviewForm productId={id} />}
//             <ReviewList productId={id} />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// 
// export default ProductDetails;
