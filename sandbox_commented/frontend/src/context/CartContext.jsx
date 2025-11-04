// import React, { createContext, useContext, useReducer, useEffect } from "react";
// 
// const CartContext = createContext();
// 
// const cartReducer = (state, action) => {
//   switch (action.type) {
//     case "ADD_TO_CART":
//       const existingItem = state.items.find(
//         (item) => item.id === action.payload.id,
//       );
//       if (existingItem) {
//         return {
//           ...state,
//           items: state.items.map((item) =>
//             item.id === action.payload.id
//               ? { ...item, quantity: item.quantity + 1 }
//               : item,
//           ),
//         };
//       }
//       return {
//         ...state,
//         items: [...state.items, { ...action.payload, quantity: 1 }],
//       };
//     case "REMOVE_FROM_CART":
//       return {
//         ...state,
//         items: state.items.filter((item) => item.id !== action.payload),
//       };
//     case "UPDATE_QUANTITY":
//       return {
//         ...state,
//         items: state.items.map((item) =>
//           item.id === action.payload.id
//             ? { ...item, quantity: action.payload.quantity }
//             : item,
//         ),
//       };
//     case "CLEAR_CART":
//       return { ...state, items: [] };
//     case "SET_CART":
//       return { ...state, items: action.payload };
//     default:
//       return state;
//   }
// };
// 
// export const CartProvider = ({ children }) => {
//   const [state, dispatch] = useReducer(cartReducer, { items: [] });
// 
//   const addToCart = (product) => {
//     dispatch({ type: "ADD_TO_CART", payload: product });
//   };
// 
//   const removeFromCart = (productId) => {
//     dispatch({ type: "REMOVE_FROM_CART", payload: productId });
//   };
// 
//   const updateQuantity = (productId, quantity) => {
//     if (quantity <= 0) {
//       removeFromCart(productId);
//     } else {
//       dispatch({
//         type: "UPDATE_QUANTITY",
//         payload: { id: productId, quantity },
//       });
//     }
//   };
// 
//   const clearCart = () => {
//     dispatch({ type: "CLEAR_CART" });
//   };
// 
//   const setCart = (items) => {
//     dispatch({ type: "SET_CART", payload: items });
//   };
// 
//   const getTotal = () => {
//     return state.items.reduce(
//       (total, item) => total + item.price * item.quantity,
//       0,
//     );
//   };
// 
//   const getItemCount = () => {
//     return state.items.reduce((count, item) => count + item.quantity, 0);
//   };
// 
//   useEffect(() => {
//     // Persist cart to localStorage
//     localStorage.setItem("cart", JSON.stringify(state.items));
//   }, [state.items]);
// 
//   useEffect(() => {
//     // Load cart from localStorage on mount
//     const savedCart = localStorage.getItem("cart");
//     if (savedCart) {
//       setCart(JSON.parse(savedCart));
//     }
//   }, []);
// 
//   return (
//     <CartContext.Provider
//       value={{
//         items: state.items,
//         addToCart,
//         removeFromCart,
//         updateQuantity,
//         clearCart,
//         getTotal,
//         getItemCount,
//       }}
//     >
//       {children}
//     </CartContext.Provider>
//   );
// };
// 
// export const useCart = () => {
//   const context = useContext(CartContext);
//   if (!context) {
//     throw new Error("useCart must be used within a CartProvider");
//   }
//   return context;
// };
// 
// export { CartContext };
