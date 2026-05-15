import React from 'react';
import { Link } from 'react-router-dom';

// Pharmacies feature removed — this page kept as a stub to avoid breaking routes/imports.
const Pharmacies = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h1 className="text-2xl font-semibold mb-4">Pharmacies (disabled)</h1>
        <p className="text-gray-600 mb-6">The Pharmacies directory has been disabled in this deployment.</p>
        <Link to="/" className="text-primary hover:underline">Return to home</Link>
      </div>
    </div>
  );
};

export default Pharmacies;
