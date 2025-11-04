// import React, { useState, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext';
// import { prescriptionService } from '../services/prescriptionService';
// import { inventoryService } from '../services/inventoryService';
// 
// const ReportsDashboard = () => {
//   const [reportData, setReportData] = useState({
//     dailyPrescriptions: [],
//     medicinesDispensed: [],
//     stockUsage: [],
//     inventoryTrends: [],
//     performanceMetrics: []
//   });
//   const [dateRange, setDateRange] = useState({
//     startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
//     endDate: new Date().toISOString().split('T')[0]
//   });
//   const [loading, setLoading] = useState(true);
//   const { user } = useAuth();
// 
//   useEffect(() => {
//     fetchReportData();
//   }, [dateRange]);
// 
//   const fetchReportData = async () => {
//     try {
//       setLoading(true);
//       // In a real implementation, these would be API calls to backend report endpoints
//       const dailyData = await prescriptionService.getDailyPrescriptions(dateRange);
//       const medicinesData = await prescriptionService.getDispensedMedicines(dateRange);
//       const stockData = await inventoryService.getStockUsage(dateRange);
// 
//       setReportData({
//         dailyPrescriptions: dailyData.data || [],
//         medicinesDispensed: medicinesData.data || [],
//         stockUsage: stockData.data || [],
//         inventoryTrends: [], // Placeholder for admin data
//         performanceMetrics: [] // Placeholder for admin data
//       });
//     } catch (error) {
//       console.error('Error fetching report data:', error);
//     } finally {
//       setLoading(false);
//     }
//   };
// 
//   const exportToPDF = () => {
//     // Placeholder for PDF export functionality
//     alert('PDF export functionality will be implemented');
//   };
// 
//   const exportToCSV = () => {
//     // Placeholder for CSV export functionality
//     alert('CSV export functionality will be implemented');
//   };
// 
//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }
// 
//   return (
//     <div className="container mx-auto px-4 py-6">
//       {/* Header */}
//       <div className="mb-6">
//         <h1 className="text-3xl font-bold text-gray-800">Reports & Analytics</h1>
//         <p className="text-gray-600">
//           {user?.role === 'admin' ? 'System-wide analytics' : 'Personal performance reports'}
//         </p>
//       </div>
// 
//       {/* Date Range Filter */}
//       <div className="bg-white rounded-lg shadow-md p-6 mb-6">
//         <h2 className="text-xl font-semibold text-gray-800 mb-4">Date Range</h2>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
//             <input
//               type="date"
//               value={dateRange.startDate}
//               onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
//               className="w-full px-3 py-2 border border-gray-300 rounded-md"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
//             <input
//               type="date"
//               value={dateRange.endDate}
//               onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
//               className="w-full px-3 py-2 border border-gray-300 rounded-md"
//             />
//           </div>
//           <div className="flex items-end">
//             <button
//               onClick={fetchReportData}
//               className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//             >
//               Apply Filter
//             </button>
//           </div>
//         </div>
//       </div>
// 
//       {/* Export Buttons */}
//       <div className="flex space-x-4 mb-6">
//         <button
//           onClick={exportToPDF}
//           className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
//         >
//           Export PDF
//         </button>
//         <button
//           onClick={exportToCSV}
//           className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
//         >
//           Export CSV
//         </button>
//       </div>
// 
//       {/* Pharmacist Reports */}
//       {user?.role === 'pharmacist' && (
//         <div className="space-y-6">
//           {/* Daily Prescriptions */}
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4">Daily Prescriptions Handled</h2>
//             <div className="overflow-x-auto">
//               <table className="min-w-full table-auto">
//                 <thead>
//                   <tr className="bg-gray-50">
//                     <th className="px-4 py-2 text-left">Date</th>
//                     <th className="px-4 py-2 text-left">Validated</th>
//                     <th className="px-4 py-2 text-left">Rejected</th>
//                     <th className="px-4 py-2 text-left">Dispensed</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {reportData.dailyPrescriptions.map((item, index) => (
//                     <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
//                       <td className="px-4 py-2">{item.date}</td>
//                       <td className="px-4 py-2">{item.validated}</td>
//                       <td className="px-4 py-2">{item.rejected}</td>
//                       <td className="px-4 py-2">{item.dispensed}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
// 
//           {/* Medicines Dispensed */}
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4">Medicines Dispensed</h2>
//             <div className="overflow-x-auto">
//               <table className="min-w-full table-auto">
//                 <thead>
//                   <tr className="bg-gray-50">
//                     <th className="px-4 py-2 text-left">Medicine</th>
//                     <th className="px-4 py-2 text-left">Quantity</th>
//                     <th className="px-4 py-2 text-left">Total Value</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {reportData.medicinesDispensed.map((item, index) => (
//                     <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
//                       <td className="px-4 py-2">{item.name}</td>
//                       <td className="px-4 py-2">{item.quantity}</td>
//                       <td className="px-4 py-2">KES {item.totalValue}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
// 
//           {/* Stock Usage */}
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4">Stock Usage</h2>
//             <div className="overflow-x-auto">
//               <table className="min-w-full table-auto">
//                 <thead>
//                   <tr className="bg-gray-50">
//                     <th className="px-4 py-2 text-left">Product</th>
//                     <th className="px-4 py-2 text-left">Starting Stock</th>
//                     <th className="px-4 py-2 text-left">Dispensed</th>
//                     <th className="px-4 py-2 text-left">Ending Stock</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {reportData.stockUsage.map((item, index) => (
//                     <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
//                       <td className="px-4 py-2">{item.product}</td>
//                       <td className="px-4 py-2">{item.startingStock}</td>
//                       <td className="px-4 py-2">{item.dispensed}</td>
//                       <td className="px-4 py-2">{item.endingStock}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       )}
// 
//       {/* Admin Reports */}
//       {user?.role === 'admin' && (
//         <div className="space-y-6">
//           {/* Inventory Trends */}
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4">Inventory Trends</h2>
//             <p className="text-gray-600">Advanced inventory analytics will be displayed here</p>
//           </div>
// 
//           {/* Pharmacist Performance */}
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4">Pharmacist Performance</h2>
//             <p className="text-gray-600">Pharmacist performance metrics will be displayed here</p>
//           </div>
// 
//           {/* Prescription Validation Metrics */}
//           <div className="bg-white rounded-lg shadow-md p-6">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4">Prescription Validation Metrics</h2>
//             <p className="text-gray-600">Prescription validation analytics will be displayed here</p>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };
// 
// export default ReportsDashboard;
