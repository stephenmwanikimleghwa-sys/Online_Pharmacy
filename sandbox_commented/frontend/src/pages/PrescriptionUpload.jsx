// import React, { useState, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';
// 
// const PrescriptionUpload = () => {
//   const [file, setFile] = useState(null);
//   const [preview, setPreview] = useState(null);
//   const [uploading, setUploading] = useState(false);
//   const [message, setMessage] = useState('');
//   const fileInputRef = useRef(null);
//   const navigate = useNavigate();
// 
//   const handleFileChange = (e) => {
//     const selectedFile = e.target.files[0];
//     if (selectedFile) {
//       setFile(selectedFile);
//       const reader = new FileReader();
//       reader.onloadend = () => {
//         setPreview(reader.result);
//       };
//       reader.readAsDataURL(selectedFile);
//     }
//   };
// 
//   const handleUpload = async () => {
//     if (!file) {
//       setMessage('Please select a file to upload.');
//       return;
//     }
// 
//     setUploading(true);
//     setMessage('');
// 
//     const formData = new FormData();
//     formData.append('prescription_file', file);
// 
//     try {
//       // Assume JWT token is stored in localStorage or context
//       const token = localStorage.getItem('access_token');
//       const response = await axios.post('/api/prescriptions/upload/', formData, {
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'multipart/form-data',
//         },
//       });
// 
//       if (response.status === 201) {
//         setMessage('Prescription uploaded successfully!');
//         setTimeout(() => {
//           navigate('/account/prescriptions');
//         }, 2000);
//       }
//     } catch (error) {
//       setMessage('Upload failed. Please try again.');
//       console.error('Upload error:', error);
//     } finally {
//       setUploading(false);
//     }
//   };
// 
//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
//       <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
//         <h1 className="text-2xl font-bold text-blue-600 mb-6 text-center">Upload Prescription</h1>
// 
//         <div className="mb-6">
//           <label className="block text-sm font-medium text-gray-700 mb-2">Select Prescription File</label>
//           <input
//             type="file"
//             ref={fileInputRef}
//             onChange={handleFileChange}
//             accept=".pdf,.jpg,.jpeg,.png"
//             className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
//           />
//         </div>
// 
//         {preview && (
//           <div className="mb-6">
//             <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
//             {file.type.startsWith('image/') ? (
//               <img src={preview} alt="Preview" className="max-w-full h-48 object-contain border rounded" />
//             ) : (
//               <p className="text-sm text-gray-500">Preview not available for this file type (PDF).</p>
//             )}
//           </div>
//         )}
// 
//         <button
//           onClick={handleUpload}
//           disabled={!file || uploading}
//           className={`w-full py-2 px-4 rounded-md text-white font-medium ${
//             !file || uploading
//               ? 'bg-gray-400 cursor-not-allowed'
//               : 'bg-green-600 hover:bg-green-700'
//           } transition duration-200`}
//         >
//           {uploading ? 'Uploading...' : 'Upload Prescription'}
//         </button>
// 
//         {message && (
//           <p className={`mt-4 text-sm text-center ${
//             message.includes('successfully') ? 'text-green-600' : 'text-red-600'
//           }`}>
//             {message}
//           </p>
//         )}
// 
//         <button
//           onClick={() => navigate('/account')}
//           className="w-full mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition duration-200"
//         >
//           Back to Account
//         </button>
//       </div>
//     </div>
//   );
// };
// 
// export default PrescriptionUpload;
