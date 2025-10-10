import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import axios from 'axios';

const Dashboard = () => {
  const [prescriptionData, setPrescriptionData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demonstration; replace with actual API calls
    const mockPrescriptionData = [
      { name: 'Jan', volume: 4000, verified: 2400 },
      { name: 'Feb', volume: 3000, verified: 1398 },
      { name: 'Mar', volume: 2000, verified: 9800 },
      { name: 'Apr', volume: 2780, verified: 3908 },
      { name: 'May', volume: 1890, verified: 4800 },
      { name: 'Jun', volume: 2390, verified: 3800 },
    ];

    const mockInventoryData = [
      { category: 'Pain Relief', stock: 400, lowStock: 50 },
      { category: 'Antibiotics', stock: 300, lowStock: 20 },
      { category: 'Vitamins', stock: 500, lowStock: 100 },
      { category: 'Chronic Care', stock: 200, lowStock: 30 },
    ];

    setPrescriptionData(mockPrescriptionData);
    setInventoryData(mockInventoryData);
    setLoading(false);

    // Example API call (uncomment and adjust for real use)
    // axios.get('/api/reports/prescription-volume?start=2023-01-01&end=2023-12-31', {
    //   headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    // }).then(response => {
    //   setPrescriptionData(response.data.data.volumes || []);
    // }).catch(error => console.error('Error fetching data:', error));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-primary-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-secondary min-h-screen">
      <h1 className="text-3xl font-bold text-primary-700 mb-6">Reports Dashboard</h1>

      {/* Prescription Volume Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">Prescription Volumes</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={prescriptionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="volume" fill="#007bff" name="Total Volume" />
            <Bar dataKey="verified" fill="#6c757d" name="Verified" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Turnaround Times Trend */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">Turnaround Times (Hours)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={prescriptionData.map(d => ({ ...d, turnaround: Math.random() * 24 }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="turnaround" stroke="#007bff" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Inventory Monitoring */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-primary-700 mb-4">Inventory Usage by Category</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={inventoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="stock" fill="#007bff" name="Current Stock" />
            <Bar dataKey="lowStock" fill="#dc3545" name="Low Stock Threshold" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-primary-50 p-4 rounded-lg text-center">
          <h3 className="text-primary-700 font-semibold">Total Prescriptions</h3>
          <p className="text-2xl font-bold text-primary-500">{prescriptionData.reduce((sum, d) => sum + d.volume, 0)}</p>
        </div>
        <div className="bg-primary-50 p-4 rounded-lg text-center">
          <h3 className="text-primary-700 font-semibold">Avg Turnaround</h3>
          <p className="text-2xl font-bold text-primary-500">12.5 hrs</p>
        </div>
        <div className="bg-primary-50 p-4 rounded-lg text-center">
          <h3 className="text-primary-700 font-semibold">Low Stock Items</h3>
          <p className="text-2xl font-bold text-primary-500">{inventoryData.filter(d => d.stock < d.lowStock).length}</p>
        </div>
        <div className="bg-primary-50 p-4 rounded-lg text-center">
          <h3 className="text-primary-700 font-semibold">Total Patients</h3>
          <p className="text-2xl font-bold text-primary-500">1,250</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-md">
          Export Report (PDF/CSV)
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
