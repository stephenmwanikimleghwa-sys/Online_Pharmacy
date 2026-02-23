import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from "../components/LoadingSpinner";

const ForcePasswordChange: React.FC = () => {
    const { user, logout, getDashboardPath, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [passwords, setPasswords] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [showPasswords, setShowPasswords] = useState({
        old: false,
        new: false,
        confirm: false,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswords((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await api.post("/auth/change-password/", {
                old_password: passwords.oldPassword,
                new_password: passwords.newPassword,
            });

            // Update local user state if necessary (must_change_password is now false)
            if (user) {
                await updateProfile({ ...user, must_change_password: false });
            }

            navigate(getDashboardPath());
        } catch (err: any) {
            console.error("Password change failed:", err);
            const serverError = err.response?.data;
            if (typeof serverError === "string") {
                setError(serverError);
            } else if (serverError?.detail) {
                setError(serverError.detail);
            } else if (serverError?.old_password) {
                setError(`Old Password: ${serverError.old_password.join(" ")}`);
            } else if (serverError?.new_password) {
                setError(`New Password: ${serverError.new_password.join(" ")}`);
            } else {
                setError("Failed to change password. Please check your old password.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-slate-50"
            style={{ background: "linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #ecfdf5 100%)" }}>
            <div className="w-full max-w-md">
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-premium border border-white/70 p-8">
                    <div className="mb-8 text-center">
                        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                            <ShieldCheckIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-display font-bold text-slate-900 mb-1">Security Update</h2>
                        <p className="text-slate-500 text-sm">For your security, you must change your password before continuing.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
                            <div className="relative">
                                <input
                                    name="oldPassword"
                                    type={showPasswords.old ? "text" : "password"}
                                    required
                                    value={passwords.oldPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                                />
                                <button type="button" onClick={() => setShowPasswords(p => ({ ...p, old: !p.old }))} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                                    {showPasswords.old ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                            <div className="relative">
                                <input
                                    name="newPassword"
                                    type={showPasswords.new ? "text" : "password"}
                                    required
                                    value={passwords.newPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                                />
                                <button type="button" onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                                    {showPasswords.new ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    name="confirmPassword"
                                    type={showPasswords.confirm ? "text" : "password"}
                                    required
                                    value={passwords.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                                />
                                <button type="button" onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400">
                                    {showPasswords.confirm ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                                <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-glow hover:shadow-premium transition-all"
                                style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
                            >
                                {loading ? "Updating..." : "Update Password & Continue"}
                            </button>
                            <button
                                type="button"
                                onClick={logout}
                                className="w-full py-3 px-4 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-100 transition-all"
                            >
                                Sign Out
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForcePasswordChange;
