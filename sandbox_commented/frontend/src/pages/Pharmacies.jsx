// import React, { useState, useEffect } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import axios from 'axios';
// import { useAuth } from '../context/AuthContext';
// import PharmacyCard from '../components/PharmacyCard'; // Assuming a PharmacyCard component exists or create one
// 
// const Pharmacies = () => {
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedCounty, setSelectedCounty] = useState('');
//   const { token } = useAuth();
// 
//   const { data: pharmacies, isLoading, error } = useQuery({
//     queryKey: ['pharmacies', searchQuery, selectedCounty],
//     queryFn: async () => {
//       const params = new URLSearchParams();
//       if (searchQuery) params.append('q', searchQuery);
//       if (selectedCounty) params.append('county', selectedCounty);
// 
//       const response = await axios.get(`/api/pharmacies/search/?${params.toString()}`, {
//         headers: token ? { Authorization: `Bearer ${token}` } : {},
//       });
//       return response.data;
//     },
//     staleTime: 5 * 60 * 1000, // 5 minutes
//   });
// 
//   const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Other']; // From model choices
// 
//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-lg text-gray-600">Loading pharmacies...</div>
//       </div>
//     );
//   }
// 
//   if (error) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50">
//         <div className="text-red-600">Error loading pharmacies: {error.message}</div>
//       </div>
//     );
//   }
// 
//   const filteredPharmacies = pharmacies || [];
// 
//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <h1 className="text-3xl font-bold text-gray-900 mb-6">Find Nearby Pharmacies</h1>
// 
//         {/* Search and Filter */}
//         <div className="bg-white p-6 rounded-lg shadow-md mb-8">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <input
//               type="text"
//               placeholder="Search pharmacies by name or location..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             />
//             <select
//               value={selectedCounty}
//               onChange={(e) => setSelectedCounty(e.target.value)}
//               className="p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             >
//               <option value="">All Counties</option>
//               {counties.map((county) => (
//                 <option key={county} value={county}>
//                   {county}
//                 </option>
//               ))}
//             </select>
//             <button
//               onClick={() => {
//                 setSearchQuery('');
//                 setSelectedCounty('');
//               }}
//               className="p-3 bg-gray-500 text-white rounded-md hover:bg-gray-600"
//             >
//               Clear Filters
//             </button>
//           </div>
//         </div>
// 
//         {/* Pharmacies List */}
//         {filteredPharmacies.length === 0 ? (
//           <div className="text-center py-12">
//             <h2 className="text-xl font-semibold text-gray-900 mb-2">No Pharmacies Found</h2>
//             <p className="text-gray-600">Try adjusting your search or filters.</p>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {filteredPharmacies.map((pharmacy) => (
//               <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
// 
// export default Pharmacies;
