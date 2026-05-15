import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { Tab } from "@headlessui/react";
import ImageWithFallback from "../components/ImageWithFallback";
import {
  PencilIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

const UserAccount = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
        const profileRes = await axios.get(`${API_BASE_URL}/auth/profile/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(profileRes.data);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 opacity-40">
          <div className="w-10 h-10 border-[3px] border-indigo-600 border-t-transparent rounded-xl animate-spin shadow-glow-indigo"></div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p className="text-rose-900 font-bold text-sm tracking-tight">{error}</p>
        </div>
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      {/* Header Section */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 btn-primary rounded-xl flex items-center justify-center shadow-glow">
            <UserCircleIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">My <span className="text-primary">Account</span></h1>
        </div>
        <p className="text-lg text-slate-500 font-medium">Manage your profile and account settings.</p>
      </div>

      {/* Profile Card */}
      {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Profile Card */}
          <div className="lg:col-span-8 glass-card rounded-[2.5rem] border border-white/60 shadow-premium overflow-hidden">
            <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Profile Information</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Personal Details</p>
            </div>

            <div className="p-10">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mb-10">
                <div className="relative group">
                  <ImageWithFallback
                    src={profile.profile_picture}
                    alt={profile.full_name || `${profile.first_name} ${profile.last_name}`}
                    fallbackText={profile.full_name || `${profile.first_name} ${profile.last_name}`}
                    className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-100 group-hover:ring-indigo-300 transition-all shadow-sm"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-display font-bold text-slate-900 tracking-tight">
                    {profile.full_name || `${profile.first_name} ${profile.last_name}`}
                  </p>
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      <span className="text-sm font-medium">{profile.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span className="text-sm font-medium">{profile.phone_number}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Role</p>
                  <span className="px-3 py-1 bg-indigo-50 text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest border border-indigo-100 capitalize">
                    {profile.role}
                  </span>
                </div>
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Address</p>
                  <p className="text-sm font-bold text-slate-700">{profile.address || "No address provided"}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  const updatedData = {
                    first_name: prompt("Enter first name:", profile.first_name) || profile.first_name,
                    last_name: prompt("Enter last name:", profile.last_name) || profile.last_name,
                    phone_number: prompt("Enter phone number:", profile.phone_number) || profile.phone_number,
                    address: prompt("Enter address:", profile.address) || profile.address,
                  };

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
                className="mt-8 px-6 py-3.5 btn-primary text-white rounded-2xl  shadow-premium hover:shadow-glow transition-all active:scale-[0.98] flex items-center gap-2 group font-bold text-xs uppercase tracking-widest"
              >
                <PencilIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                Edit Profile
              </button>
            </div>
          </div>

          {/* Side Panel */}
          <div className="lg:col-span-4 bg-slate-900 rounded-[2.5rem] p-8 shadow-glow-indigo text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 btn-primary/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:btn-primary/20 transition-colors duration-700"></div>
            <div>
              <h3 className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.2em] mb-6 relative z-10">Account Status</h3>
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Username</span>
                  <span className="font-display font-bold text-lg">{user?.username}</span>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                  <span className="text-emerald-300 text-xs font-bold uppercase tracking-widest">Status</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    <span className="font-display font-bold text-emerald-400">Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Role</span>
                  <span className="font-display font-bold capitalize">{profile.role}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAccount;
