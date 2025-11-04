import React from 'react';
import { Link } from 'react-router-dom';

// PharmaciesDirectory removed — keep stub to avoid breaking imports/routes.
const PharmaciesDirectory = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-semibold mb-2">Pharmacies Directory (disabled)</h1>
      <p className="text-gray-600 mb-4">This feature has been disabled in the current deployment.</p>
      <Link to="/" className="text-blue-600 hover:underline">Return home</Link>
    </div>
  </div>
);

export default PharmaciesDirectory;
