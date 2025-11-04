// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { prescriptionService } from '../services/prescriptionService';
// 
// const AddPrescription = () => {
//   const [patientDetails, setPatientDetails] = useState({
//     name: '',
//     age: '',
//     gender: '',
//     contact: '',
//     idNumber: ''
//   });
//   const [medicines, setMedicines] = useState([{
//     medicine: '',
//     dosage: '',
//     quantity: '',
//     instructions: ''
//   }]);
//   const [prescriptionFile, setPrescriptionFile] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const { user } = useAuth();
//   const navigate = useNavigate();
// 
//   const handlePatientChange = (e) => {
//     setPatientDetails({
//       ...patientDetails,
//       [e.target.name]: e.target.value
//     });
//   };
// 
//   const handleMedicineChange = (index, e) => {
//     const newMedicines = [...medicines];
//     newMedicines[index][e.target.name] = e.target.value;
//     setMedicines(newMedicines);
//   };
// 
//   const addMedicineField = () => {
//     setMedicines([...medicines, {
//       medicine: '',
//       dosage: '',
//       quantity: '',
//       instructions: ''
//     }]);
//   };
// 
//   const removeMedicineField = (index) => {
//     const newMedicines = medicines.filter((_, i) => i !== index);
//     setMedicines(newMedicines);
//   };
// 
//   const handleFileChange = (e) => {
//     setPrescriptionFile(e.target.files[0]);
//   };
// 
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
// 
//     try {
//       const formData = new FormData();
// 
//       // Add patient details
//       Object.keys(patientDetails).forEach(key => {
//         formData.append(key, patientDetails[key]);
//       });
// 
//       // Add medicines
//       medicines.forEach((medicine, index) => {
//         Object.keys(medicine).forEach(key => {
//           formData.append(`medicines[${index}][${key}]`, medicine[key]);
//         });
//       });
// 
//       // Add file if exists
//       if (prescriptionFile) {
//         formData.append('file', prescriptionFile);
//       }
// 
//       // Add pharmacist info
//       formData.append('added_by', user.id);
//       formData.append('status', 'pending');
// 
//       await prescriptionService.addPrescription(formData);
//   navigate('/pharmacist/dashboard');
//     } catch (error) {
//       console.error('Error adding prescription:', error);
//       alert('Failed to add prescription. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };
// 
//   return (
//     <div className="container mx-auto px-4 py-6">
//       <div className="max-w-4xl mx-auto">
//         <h1 className="text-3xl font-bold text-gray-800 mb-6">Add Prescription</h1>
// 
//         <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
//           {/* Patient Details Section */}
//           <div className="mb-6">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4">Patient Details</h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Full Name *
//                 </label>
//                 <input
//                   type="text"
//                   name="name"
//                   value={patientDetails.name}
//                   onChange={handlePatientChange}
//                   required
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Age *
//                 </label>
//                 <input
//                   type="number"
//                   name="age"
//                   value={patientDetails.age}
//                   onChange={handlePatientChange}
//                   required
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Gender *
//                 </label>
//                 <select
//                   name="gender"
//                   value={patientDetails.gender}
//                   onChange={handlePatientChange}
//                   required
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="">Select Gender</option>
//                   <option value="male">Male</option>
//                   <option value="female">Female</option>
//                   <option value="other">Other</option>
//                 </select>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Contact Number *
//                 </label>
//                 <input
//                   type="tel"
//                   name="contact"
//                   value={patientDetails.contact}
//                   onChange={handlePatientChange}
//                   required
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//               <div className="md:col-span-2">
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   ID Number
//                 </label>
//                 <input
//                   type="text"
//                   name="idNumber"
//                   value={patientDetails.idNumber}
//                   onChange={handlePatientChange}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//             </div>
//           </div>
// 
//           {/* Prescribed Medicines Section */}
//           <div className="mb-6">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4">Prescribed Medicines</h2>
//             {medicines.map((medicine, index) => (
//               <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Medicine Name *
//                     </label>
//                     <input
//                       type="text"
//                       name="medicine"
//                       value={medicine.medicine}
//                       onChange={(e) => handleMedicineChange(index, e)}
//                       required
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Dosage *
//                     </label>
//                     <input
//                       type="text"
//                       name="dosage"
//                       value={medicine.dosage}
//                       onChange={(e) => handleMedicineChange(index, e)}
//                       required
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Quantity *
//                     </label>
//                     <input
//                       type="number"
//                       name="quantity"
//                       value={medicine.quantity}
//                       onChange={(e) => handleMedicineChange(index, e)}
//                       required
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       Usage Instructions
//                     </label>
//                     <input
//                       type="text"
//                       name="instructions"
//                       value={medicine.instructions}
//                       onChange={(e) => handleMedicineChange(index, e)}
//                       className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//                     />
//                   </div>
//                 </div>
//                 {medicines.length > 1 && (
//                   <button
//                     type="button"
//                     onClick={() => removeMedicineField(index)}
//                     className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
//                   >
//                     Remove
//                   </button>
//                 )}
//               </div>
//             ))}
//             <button
//               type="button"
//               onClick={addMedicineField}
//               className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//             >
//               Add Another Medicine
//             </button>
//           </div>
// 
//           {/* Prescription Upload Section */}
//           <div className="mb-6">
//             <h2 className="text-xl font-semibold text-gray-800 mb-4">Prescription Upload (Optional)</h2>
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Upload Prescription Image/PDF
//               </label>
//               <input
//                 type="file"
//                 accept=".pdf,.jpg,.jpeg,.png"
//                 onChange={handleFileChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//               <p className="text-sm text-gray-500 mt-1">
//                 Supported formats: PDF, JPG, JPEG, PNG
//               </p>
//             </div>
//           </div>
// 
//           {/* Submit Button */}
//           <div className="flex justify-end">
//             <button
//               type="submit"
//               disabled={loading}
//               className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {loading ? 'Adding Prescription...' : 'Add Prescription'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };
// 
// export default AddPrescription;
