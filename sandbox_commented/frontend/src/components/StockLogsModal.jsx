// import React, { useState, useEffect } from 'react';
// import { inventoryService } from '../services/inventoryService';
// 
// const StockLogsModal = ({ item, onClose }) => {
//   const [logs, setLogs] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
// 
//   useEffect(() => {
//     fetchStockLogs();
//   }, [item]);
// 
//   const fetchStockLogs = async () => {
//     try {
//       setLoading(true);
//       const response = await inventoryService.getStockLogs(item.id);
//       setLogs(response.data || []);
//     } catch (err) {
//       setError('Failed to fetch stock logs');
//       console.error('Error fetching stock logs:', err);
//     } finally {
//       setLoading(false);
//     }
//   };
// 
//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };
// 
//   const getChangeTypeColor = (changeType) => {
//     switch (changeType) {
//       case 'restock':
//         return 'text-green-600';
//       case 'sale':
//         return 'text-red-600';
//       case 'adjustment':
//         return 'text-blue-600';
//       case 'expiry':
//         return 'text-orange-600';
//       default:
//         return 'text-gray-600';
//     }
//   };
// 
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-xl font-semibold text-gray-800">
//             Stock Logs - {item.name}
//           </h2>
//           <button
//             onClick={onClose}
//             className="text-gray-400 hover:text-gray-600 text-2xl"
//           >
//             ×
//           </button>
//         </div>
// 
//         {loading ? (
//           <div className="flex justify-center items-center h-32">
//             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//           </div>
//         ) : error ? (
//           <div className="bg-red-50 border border-red-200 rounded-md p-4">
//             <p className="text-red-800">{error}</p>
//           </div>
//         ) : logs.length === 0 ? (
//           <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
//             <p className="text-gray-600">No stock logs available</p>
//           </div>
//         ) : (
//           <div className="overflow-y-auto max-h-[60vh]">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Date & Time
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Change Type
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Previous Qty
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     New Qty
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Change Amount
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Reason
//                   </th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                     Logged By
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {logs.map((log) => (
//                   <tr key={log.id}>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {formatDate(log.timestamp)}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                       <span className={getChangeTypeColor(log.change_type)}>
//                         {log.change_type?.replace('_', ' ')}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {log.previous_quantity}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {log.new_quantity}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
//                       <span className={log.change_amount > 0 ? 'text-green-600' : 'text-red-600'}>
//                         {log.change_amount > 0 ? '+' : ''}{log.change_amount}
//                       </span>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {log.reason || 'N/A'}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {log.logged_by_username || 'System'}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
// 
//         <div className="mt-4 flex justify-end">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
//           >
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
// 
// export default StockLogsModal;
