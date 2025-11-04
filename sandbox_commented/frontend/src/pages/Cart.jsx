// import React, { useContext } from "react";
// import { Link } from "react-router-dom";
// import { CartContext } from "../context/CartContext";
// 
// const Cart = () => {
//   const {
//     items: cartItems,
//     removeFromCart,
//     updateQuantity,
//   } = useContext(CartContext);
// 
//   const total = (cartItems || []).reduce(
//     (sum, item) => sum + item.price * item.quantity,
//     0,
//   );
// 
//   if ((cartItems || []).length === 0) {
//     return (
//       <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
//         <div className="max-w-7xl mx-auto">
//           <div className="text-center">
//             <h1 className="text-3xl font-bold text-gray-900 mb-4">
//               Your Cart is Empty
//             </h1>
//             <p className="text-gray-600 mb-8">
//               Add some products to get started.
//             </p>
//             <Link
//               to="/products"
//               className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
//             >
//               Continue Shopping
//             </Link>
//           </div>
//         </div>
//       </div>
//     );
//   }
// 
//   return (
//     <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-7xl mx-auto">
//         <div className="bg-white shadow-lg rounded-lg overflow-hidden">
//           <div className="px-6 py-4 border-b border-gray-200">
//             <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
//           </div>
// 
//           <div className="divide-y divide-gray-200">
//             {cartItems.map((item) => (
//               <div key={item.id} className="flex py-6 px-6">
//                 <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
//                   <img
//                     src={item.image || "/placeholder-product.jpg"}
//                     alt={item.name}
//                     className="h-full w-full object-cover object-center"
//                   />
//                 </div>
// 
//                 <div className="ml-4 flex flex-1 flex-col">
//                   <div>
//                     <h3 className="text-sm font-medium text-gray-900">
//                       <Link
//                         to={`/products/${item.id}`}
//                         className="hover:text-blue-600"
//                       >
//                         {item.name}
//                       </Link>
//                     </h3>
//                     <p className="text-sm text-gray-500 mt-1">
//                       {item.pharmacy}
//                     </p>
//                   </div>
//                   <div className="flex flex-1 flex-col justify-end sm:flex-row sm:justify-between">
//                     <div className="flex items-center">
//                       <label
//                         htmlFor={`quantity-${item.id}`}
//                         className="text-sm font-medium text-gray-700 mr-2"
//                       >
//                         Qty:
//                       </label>
//                       <select
//                         id={`quantity-${item.id}`}
//                         value={item.quantity}
//                         onChange={(e) =>
//                           updateQuantity(item.id, parseInt(e.target.value))
//                         }
//                         className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                       >
//                         {[1, 2, 3, 4, 5].map((num) => (
//                           <option key={num} value={num}>
//                             {num}
//                           </option>
//                         ))}
//                       </select>
//                     </div>
//                     <p className="text-sm font-medium text-gray-900 mt-2 sm:mt-0">
//                       KES {item.price * item.quantity}
//                     </p>
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => removeFromCart(item.id)}
//                   className="font-medium text-red-600 hover:text-red-500 ml-4"
//                 >
//                   Remove
//                 </button>
//               </div>
//             ))}
//           </div>
// 
//           <div className="border-t border-gray-200 px-6 py-6 bg-gray-50">
//             <div className="flex justify-between text-base font-medium text-gray-900">
//               <p>Total</p>
//               <p>KES {total.toLocaleString()}</p>
//             </div>
//             <p className="mt-0.5 text-sm text-gray-500">
//               Shipping and taxes calculated at checkout.
//             </p>
//             <div className="mt-6 flex justify-center space-x-4">
//               <Link
//                 to="/products"
//                 className="text-center text-sm text-blue-600 hover:text-blue-500 font-medium"
//               >
//                 Continue Shopping
//                 <span aria-hidden="true"> &rarr;</span>
//               </Link>
//               <Link
//                 to="/checkout"
//                 className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 text-center"
//               >
//                 Proceed to Checkout
//               </Link>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };
// 
// export default Cart;
