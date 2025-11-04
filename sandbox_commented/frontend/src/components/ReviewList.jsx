// import React from 'react';
// import { StarIcon } from '@heroicons/react/24/solid'; // Assuming Heroicons are installed; otherwise use simple stars
// 
// const ReviewList = ({ reviews, productId }) => {
//   if (!reviews || reviews.length === 0) {
//     return (
//       <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg">
//         No reviews yet. Be the first to review this product!
//       </div>
//     );
//   }
// 
//   const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
// 
//   return (
//     <div className="mt-6">
//       {/* Average Rating Summary */}
//       <div className="flex items-center mb-4">
//         <h3 className="text-lg font-semibold text-gray-900 mr-2">Average Rating: {averageRating.toFixed(1)} / 5</h3>
//         <div className="flex items-center">
//           {[...Array(5)].map((_, i) => (
//             <StarIcon
//               key={i}
//               className={`h-5 w-5 ${i < Math.round(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
//             />
//           ))}
//         </div>
//         <span className="ml-2 text-sm text-gray-500">({reviews.length} reviews)</span>
//       </div>
// 
//       {/* Individual Reviews */}
//       <div className="space-y-4">
//         {reviews.map((review) => (
//           <div key={review.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
//             {/* Rating and User */}
//             <div className="flex items-center justify-between mb-2">
//               <div className="flex items-center">
//                 <div className="flex">
//                   {[...Array(5)].map((_, i) => (
//                     <StarIcon
//                       key={i}
//                       className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
//                     />
//                   ))}
//                 </div>
//                 <span className="ml-2 text-sm font-medium text-gray-900">{review.user.username}</span>
//               </div>
//               <span className="text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
//             </div>
// 
//             {/* Comment */}
//             <p className="text-gray-700">{review.comment}</p>
// 
//             {/* Optional: If review has is_active or other status */}
//             {review.is_active === false && (
//               <p className="text-xs text-red-500 mt-2">This review is pending moderation.</p>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };
// 
// export default ReviewList;
