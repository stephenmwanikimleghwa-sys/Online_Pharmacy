import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Tab } from "@headlessui/react"; // For tabs, install @headlessui/react
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

  const API_BASE = "http://localhost:8000/api"; // Backend API base URL

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
        const profileRes = await axios.get(`${API_BASE}/auth/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(profileRes.data);

        // Fetch wallet (stub - implement actual endpoint)
        // const walletRes = await axios.get(`${API_BASE}/wallet/`, { headers: { Authorization: `Bearer ${token}` } });
        setWallet({
          balance: 1500.0,
          transactions: [
            {
              id: 1,
              amount: -50,
              date: "2024-01-15",
              description: "Order #123",
            },
          ],
        });

        // Fetch prescriptions
        const presRes = await axios.get(`${API_BASE}/prescriptions/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPrescriptions(presRes.data);

        // Fetch orders
        const ordersRes = await axios.get(`${API_BASE}/orders/`, {
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">My Account</h1>
          <p className="text-gray-600 mt-2">
            Manage your profile, orders, and more
          </p>
        </div>

        {/* Tabs */}
        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-8 max-w-md mx-auto">
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
            <Tab.Panel className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Profile Information
              </h2>
              {profile && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={profile.profile_picture || "/default-avatar.png"}
                      alt="Profile"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-lg font-medium">
                        {profile.full_name ||
                          `${profile.first_name} ${profile.last_name}`}
                      </p>
                      <p className="text-gray-600">{profile.email}</p>
                      <p className="text-gray-600">{profile.phone_number}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Role
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile.role}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {profile.address}
                      </p>
                    </div>
                  </div>
                  <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition">
                    Edit Profile
                  </button>
                </div>
              )}
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
