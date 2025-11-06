import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Tab } from "@headlessui/react"; // For tabs, install @headlessui/react
import ImageWithFallback from "../components/ImageWithFallback";
import {
  PencilIcon,
  WalletIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

const UserAccount = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [prescriptions, setPrescriptions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL; // Backend API base URL

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!token || !user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch profile
        const profileRes = await axios.get(`${API_BASE_URL}/auth/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(profileRes.data);

        // Fetch wallet from API if available. If the endpoint is not implemented
        // keep an empty/default wallet (no test data shown to users).
        try {
          const walletRes = await axios.get(`${API_BASE_URL}/wallet/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          // Expecting response shape { balance: number, transactions: [...] }
          setWallet(walletRes.data || { balance: 0, transactions: [] });
        } catch (walletErr) {
          // Wallet endpoint missing or failed — do not show test data; use empty defaults
          console.log("Wallet feature not yet implemented");
          setWallet({ balance: 0, transactions: [] });
        }

        // Fetch prescriptions
        const presRes = await axios.get(`${API_BASE_URL}/prescriptions/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPrescriptions(presRes.data);

        // Fetch orders
        const ordersRes = await axios.get(`${API_BASE_URL}/orders/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(ordersRes.data);

        setError(null);
      } catch (err) {
        setError("Failed to load account data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, user]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  if (error)
    return <div className="text-red-500 text-center">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 opacity-10"></div>
          <div className="relative text-center py-8">
            <div className="mb-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">
              My Account
            </h1>
            <p className="text-gray-600 mt-2 max-w-md mx-auto">
              Manage your profile, orders, and more
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-gradient-to-r from-blue-600/10 to-blue-800/10 p-1 mb-8 max-w-md mx-auto shadow-sm">
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  selected
                    ? "bg-white shadow"
                    : "text-blue-100 hover:bg-white/[0.12] hover:text-white"
                }`
              }
            >
              <PencilIcon className="h-5 w-5 inline mr-2" />
              Profile
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  selected
                    ? "bg-white shadow"
                    : "text-blue-100 hover:bg-white/[0.12] hover:text-white"
                }`
              }
            >
              <WalletIcon className="h-5 w-5 inline mr-2" />
              Wallet
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  selected
                    ? "bg-white shadow"
                    : "text-blue-100 hover:bg-white/[0.12] hover:text-white"
                }`
              }
            >
              <DocumentTextIcon className="h-5 w-5 inline mr-2" />
              Prescriptions
            </Tab>
            <Tab
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  selected
                    ? "bg-white shadow"
                    : "text-blue-100 hover:bg-white/[0.12] hover:text-white"
                }`
              }
            >
              <ShoppingBagIcon className="h-5 w-5 inline mr-2" />
              Orders
            </Tab>
          </Tab.List>

          <Tab.Panels className="mt-2">
            {/* Profile Tab */}
            <Tab.Panel className="bg-white rounded-xl shadow-lg">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Profile Information
                </h2>
                {profile && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
                      <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                        <div className="relative group">
                          <ImageWithFallback
                            src={profile.profile_picture}
                            alt={profile.full_name || `${profile.first_name} ${profile.last_name}`}
                            fallbackText={profile.full_name || `${profile.first_name} ${profile.last_name}`}
                            className="w-20 h-20 rounded-xl object-cover ring-2 ring-blue-100 group-hover:ring-blue-300 transition-all duration-200"
                          />
                          <div className="absolute inset-0 bg-blue-600 bg-opacity-0 group-hover:bg-opacity-10 rounded-xl transition-all duration-200"></div>
                        </div>
                        <div className="flex-1">
                          <p className="text-xl font-semibold text-gray-900 mb-1">
                            {profile.full_name ||
                              `${profile.first_name} ${profile.last_name}`}
                          </p>
                          <div className="space-y-2">
                            <div className="flex items-center text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                              </svg>
                              <span>{profile.email}</span>
                            </div>
                            <div className="flex items-center text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{profile.phone_number}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Role</h3>
                        </div>
                        <p className="text-gray-600 capitalize">
                          {profile.role}
                        </p>
                      </div>
                      <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Address</h3>
                        </div>
                        <p className="text-gray-600">
                          {profile.address || "No address provided"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col space-y-4">
                      <button 
                        onClick={() => {
                          const updatedData = {
                            first_name: prompt("Enter first name:", profile.first_name) || profile.first_name,
                            last_name: prompt("Enter last name:", profile.last_name) || profile.last_name,
                            phone_number: prompt("Enter phone number:", profile.phone_number) || profile.phone_number,
                            address: prompt("Enter address:", profile.address) || profile.address,
                          };
                          
                          // Update profile using API
                          axios.patch(`${API_BASE_URL}/auth/profile/`, updatedData, {
                            headers: { Authorization: `Bearer ${token}` }
                          })
                          .then(response => {
                            setProfile(response.data);
                            alert("Profile updated successfully!");
                          })
                          .catch(error => {
                            console.error("Profile update error:", error);
                            alert(error.response?.data?.message || "Failed to update profile. Please try again.");
                          });
                        }}
                        className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-2 rounded-lg hover:opacity-90 transition-all duration-200 flex items-center justify-center space-x-2 group"
                      >
                        <PencilIcon className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                        <span>Edit Profile</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Tab.Panel>

            {/* Wallet Tab */}
            <Tab.Panel className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Wallet
              </h2>
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <p className="text-2xl font-bold text-green-600">
                  KES {wallet.balance.toFixed(2)}
                </p>
                <p className="text-gray-600">Available Balance</p>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Recent Transactions
              </h3>
              <div className="space-y-3">
                {wallet.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                  >
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-gray-500">{tx.date}</p>
                    </div>
                    <p
                      className={`font-semibold ${
                        tx.amount < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      KES {Math.abs(tx.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition">
                Add Funds
              </button>
            </Tab.Panel>

            {/* Prescriptions Tab */}
            <Tab.Panel className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Prescriptions
              </h2>
              <div className="space-y-4">
                {prescriptions.length > 0 ? (
                  prescriptions.map((pres) => (
                    <div
                      key={pres.id}
                      className="border border-gray-200 rounded-md p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Prescription #{pres.id}</p>
                          <p className="text-sm text-gray-600">
                            Status: {pres.verified_by ? "Verified" : "Pending"}
                          </p>
                          <p className="text-sm text-gray-500">
                            Uploaded:{" "}
                            {new Date(pres.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <a
                          href={pres.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View File
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">
                    No prescriptions uploaded yet.{" "}
                    <a
                      href="/upload-prescription"
                      className="text-blue-600 hover:underline"
                    >
                      Upload one now
                    </a>
                    .
                  </p>
                )}
              </div>
              <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
                Upload New Prescription
              </button>
            </Tab.Panel>

            {/* Orders Tab */}
            <Tab.Panel className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Orders
              </h2>
              <div className="space-y-4">
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-md p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Order #{order.id}</p>
                          <p className="text-sm text-gray-600">
                            Pharmacy: {order.pharmacy?.name || "N/A"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Total: KES {order.total}
                          </p>
                          <p className="text-sm text-gray-600">
                            Status:{" "}
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                order.status === "delivered"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {order.status}
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">
                            Date:{" "}
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {order.payment_id && (
                            <p className="text-sm text-gray-600">
                              Payment: {order.payment_id}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">
                    No orders yet.{" "}
                    <a
                      href="/products"
                      className="text-blue-600 hover:underline"
                    >
                      Start shopping
                    </a>
                    .
                  </p>
                )}
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default UserAccount;
