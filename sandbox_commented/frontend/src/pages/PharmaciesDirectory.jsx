// import React, { useState, useEffect } from 'react';
// import { SearchIcon, MapPinIcon, FilterIcon } from '@heroicons/react/solid';
// import axios from 'axios';
// 
// const PharmaciesDirectory = () => {
//   const [pharmacies, setPharmacies] = useState([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [selectedCounty, setSelectedCounty] = useState('');
//   const [selectedCategory, setSelectedCategory] = useState('');
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
// 
//   const counties = [
//     { value: '', label: 'All Counties' },
//     { value: 'Nairobi', label: 'Nairobi' },
//     { value: 'Mombasa', label: 'Mombasa' },
//     { value: 'Kisumu', label: 'Kisumu' },
//     { value: 'Nakuru', label: 'Nakuru' },
//     // Add more Kenyan counties as needed
//   ];
// 
//   const categories = [
//     { value: '', label: 'All Categories' },
//     { value: 'general', label: 'General Pharmacy' },
//     { value: 'specialty', label: 'Specialty Pharmacy' },
//     { value: '24-hour', label: '24-Hour Pharmacy' },
//   ];
// 
//   const fetchPharmacies = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       let url = '/api/pharmacies/';
//       const params = new URLSearchParams();
// 
//       if (searchQuery) {
//         params.append('q', searchQuery);
//       }
//       if (selectedCounty) {
//         params.append('county', selectedCounty);
//       }
//       if (selectedCategory) {
//         params.append('category', selectedCategory);
//       }
// 
//       if (params.toString()) {
//         url += `?${params.toString()}`;
//       }
// 
//       const response = await axios.get(url);
//       setPharmacies(response.data);
//     } catch (err) {
//       setError('Failed to fetch pharmacies. Please try again.');
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };
// 
//   useEffect(() => {
//     fetchPharmacies();
//   }, [searchQuery, selectedCounty, selectedCategory]);
// 
//   const handleSearch = (e) => {
//     e.preventDefault();
//     fetchPharmacies();
//   };
// 
//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="text-blue-600 text-xl">Loading pharmacies...</div>
//       </div>
//     );
//   }
// 
//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         {/* Header */}
//         <div className="text-center mb-8">
//           <h1 className="text-3xl font-bold text-blue-600">Find Pharmacies Near You</h1>
//           <p className="mt-2 text-gray-600">Search and filter pharmacies across Kenya</p>
//         </div>
// 
//         {/* Search and Filters */}
//         <div className="bg-white rounded-lg shadow-md p-6 mb-8">
//           <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-center">
//             {/* Search Input */}
//             <div className="relative flex-1">
//               <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
//               <input
//                 type="text"
//                 placeholder="Search by name, address, or location..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               />
//             </div>
// 
//             {/* Filters */}
//             <div className="flex flex-col sm:flex-row gap-4">
//               <select
//                 value={selectedCounty}
//                 onChange={(e) => setSelectedCounty(e.target.value)}
//                 className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               >
//                 {counties.map((county) => (
//                   <option key={county.value} value={county.value}>
//                     {county.label}
//                   </option>
//                 ))}
//               </select>
// 
//               <select
//                 value={selectedCategory}
//                 onChange={(e) => setSelectedCategory(e.target.value)}
//                 className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//               >
//                 {categories.map((category) => (
//                   <option key={category.value} value={category.value}>
//                     {category.label}
//                   </option>
//                 ))}
//               </select>
// 
//               <button
//                 type="submit"
//                 className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
//               >
//                 <FilterIcon className="h-5 w-5" />
//                 Filter
//               </button>
//             </div>
//           </form>
//         </div>
// 
//         {/* Error Message */}
//         {error && (
//           <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
//             {error}
//           </div>
//         )}
// 
//         {/* Pharmacies List */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {pharmacies.map((pharmacy) => (
//             <div key={pharmacy.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
//               {pharmacy.logo && (
//                 <img
//                   src={pharmacy.logo}
//                   alt={`${pharmacy.name} logo`}
//                   className="w-full h-48 object-cover"
//                 />
//               )}
//               <div className="p-6">
//                 <h3 className="text-xl font-semibold text-blue-600 mb-2">{pharmacy.name}</h3>
//                 <div className="flex items-center text-gray-500 mb-2">
//                   <MapPinIcon className="h-4 w-4 mr-1" />
//                   <span>{pharmacy.full_address || `${pharmacy.address}, ${pharmacy.city}`}</span>
//                 </div>
//                 <p className="text-gray-600 mb-4">{pharmacy.description || 'A trusted pharmacy serving your community.'}</p>
//                 <div className="flex justify-between items-center">
//                   <span className={`px-2 py-1 rounded-full text-xs ${
//                     pharmacy.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
//                   }`}>
//                     {pharmacy.is_active ? 'Active' : 'Inactive'}
//                   </span>
//                   <button className="text-blue-600 hover:text-blue-800 font-medium">View Products</button>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
// 
//         {pharmacies.length === 0 && !loading && (
//           <div className="text-center py-12">
//             <h3 className="text-lg font-medium text-gray-900 mb-2">No pharmacies found</h3>
//             <p className="text-gray-500">Try adjusting your search or filters.</p>
//           </div>
//         )}
// 
//         {/* Pagination - Add if backend supports */}
//         {pharmacies.length > 0 && (
//           <div className="mt-8 flex justify-center">
//             <nav className="flex space-x-2">
//               <button className="px-3 py-2 bg-blue-600 text-white rounded">Previous</button>
//               <button className="px-3 py-2 bg-gray-200 text-gray-700 rounded">1</button>
//               <button className="px-3 py-2 bg-blue-600 text-white rounded">Next</button>
//             </nav>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
// 
// export default PharmaciesDirectory;
