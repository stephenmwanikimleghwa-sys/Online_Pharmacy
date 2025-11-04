// import React from 'react';
// import { Link } from 'react-router-dom';
// import { StarIcon, MapPinIcon, PhoneIcon, ClockIcon } from '@heroicons/react/24/outline';
// import { CheckCircleIcon } from '@heroicons/react/24/solid';
// 
// const PharmacyCard = ({ pharmacy }) => {
//   const { id, name, address, phone_number, logo, is_verified, rating = 4.5, operating_hours } = pharmacy;
//   const fullAddress = address ? `${address.split(',')[0]}, ${pharmacy.county || 'Kenya'}` : 'Location not available';
//   const isOpen = operating_hours && Object.keys(operating_hours).length > 0; // Simplified check
// 
//   return (
//     <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-200">
//       {/* Pharmacy Logo/Image */}
//       <div className="relative h-48 bg-gradient-to-r from-blue-50 to-indigo-50">
//         {logo ? (
//           <img
//             src={logo}
//             alt={`${name} logo`}
//             className="w-full h-full object-cover"
//           />
//         ) : (
//           <div className="w-full h-full flex items-center justify-center">
//             <div className="text-gray-400 text-4xl">🏥</div>
//           </div>
//         )}
//         {/* Verification Badge */}
//         {is_verified && (
//           <div className="absolute top-2 right-2 p-1 bg-green-100 rounded-full">
//             <CheckCircleIcon className="w-5 h-5 text-green-600" />
//           </div>
//         )}
//       </div>
// 
//       {/* Content */}
//       <div className="p-6">
//         {/* Name and Rating */}
//         <div className="flex items-start justify-between mb-3">
//           <h3 className="text-xl font-semibold text-gray-900 truncate">
//             {name}
//           </h3>
//           <div className="flex items-center ml-2">
//             <div className="flex text-yellow-400">
//               {[1, 2, 3, 4, 5].map((star) => (
//                 <StarIcon
//                   key={star}
//                   className={`w-4 h-4 ${star <= Math.floor(rating) ? 'fill-current' : ''}`}
//                 />
//               ))}
//             </div>
//             <span className="ml-1 text-sm text-gray-600 font-medium">
//               {rating.toFixed(1)}
//             </span>
//           </div>
//         </div>
// 
//         {/* Address */}
//         <div className="flex items-center mb-3 text-gray-600">
//           <MapPinIcon className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
//           <p className="text-sm truncate">{fullAddress}</p>
//         </div>
// 
//         {/* Phone */}
//         {phone_number && (
//           <div className="flex items-center mb-3 text-gray-600">
//             <PhoneIcon className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
//             <a
//               href={`tel:${phone_number}`}
//               className="text-sm hover:text-blue-600 transition-colors"
//             >
//               {phone_number}
//             </a>
//           </div>
//         )}
// 
//         {/* Operating Hours */}
//         {isOpen && (
//           <div className="flex items-center text-gray-600 mb-4">
//             <ClockIcon className="w-4 h-4 mr-2 text-indigo-500 flex-shrink-0" />
//             <span className="text-sm">Open today</span>
//           </div>
//         )}
// 
//         {/* Link to Details */}
//         <Link
//           to={`/pharmacies/${id}`}
//           className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors w-full justify-center"
//         >
//           View Products & Details
//         </Link>
//       </div>
//     </div>
//   );
// };
// 
// export default PharmacyCard;
