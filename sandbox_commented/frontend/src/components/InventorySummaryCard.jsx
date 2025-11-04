// import React from 'react';
// 
// const InventorySummaryCard = ({ summary, onViewInventory }) => {
//   const {
//     totalProducts = 0,
//     lowStockItems = 0,
//     outOfStockItems = 0
//   } = summary;
// 
//   return (
//     <div className="bg-white rounded-lg shadow-md p-6">
//       <div className="flex justify-between items-center mb-4">
//         <h2 className="text-xl font-semibold text-gray-800">Inventory Summary</h2>
//         <button
//           onClick={onViewInventory}
//           className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
//         >
//           View Full Inventory
//         </button>
//       </div>
// 
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//         {/* Total Products */}
//         <div className="bg-blue-50 p-4 rounded-lg">
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm font-medium text-blue-800">Total Products</p>
//               <p className="text-2xl font-bold text-blue-900">{totalProducts}</p>
//             </div>
//             <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
//               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
//               </svg>
//             </div>
//           </div>
//         </div>
// 
//         {/* Low Stock */}
//         <div className={`p-4 rounded-lg ${lowStockItems > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm font-medium text-yellow-800">Low Stock Items</p>
//               <p className={`text-2xl font-bold ${lowStockItems > 0 ? 'text-yellow-900' : 'text-green-900'}`}>
//                 {lowStockItems}
//               </p>
//             </div>
//             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lowStockItems > 0 ? 'bg-yellow-600' : 'bg-green-600'}`}>
//               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
//               </svg>
//             </div>
//           </div>
//         </div>
// 
//         {/* Out of Stock */}
//         <div className={`p-4 rounded-lg ${outOfStockItems > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm font-medium text-red-800">Out of Stock</p>
//               <p className={`text-2xl font-bold ${outOfStockItems > 0 ? 'text-red-900' : 'text-green-900'}`}>
//                 {outOfStockItems}
//               </p>
//             </div>
//             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${outOfStockItems > 0 ? 'bg-red-600' : 'bg-green-600'}`}>
//               <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//               </svg>
//             </div>
//           </div>
//         </div>
//       </div>
// 
//       {lowStockItems > 0 && (
//         <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded-md">
//           <p className="text-sm text-yellow-800">
//             ⚠️ {lowStockItems} product{lowStockItems !== 1 ? 's' : ''} running low on stock
//           </p>
//         </div>
//       )}
// 
//       {outOfStockItems > 0 && (
//         <div className="mt-2 p-3 bg-red-100 border border-red-200 rounded-md">
//           <p className="text-sm text-red-800">
//             ❌ {outOfStockItems} product{outOfStockItems !== 1 ? 's' : ''} out of stock
//           </p>
//         </div>
//       )}
//     </div>
//   );
// };
// 
// export default InventorySummaryCard;
