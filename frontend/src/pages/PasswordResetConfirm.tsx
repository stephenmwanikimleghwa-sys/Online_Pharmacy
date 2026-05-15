import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from '../components/LoadingSpinner';

const PasswordResetConfirm: React.FC = () => {
    const { uid, token } = useParams();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            await api.post("/auth/password-reset-confirm/", {
                uidb64: uid,
                token: token,
                new_password: newPassword
            });
            setMessage("Password successfully reset! Redirecting to login...");
            setTimeout(() => {
                navigate("/login");
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || err.response?.data?.detail || "Failed to reset password. Link may be expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12"
            style={{ background: "linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #ecfdf5 100%)" }}>
            <div className="w-full max-w-md">
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-premium border border-white/70 p-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-display font-bold text-slate-900 mb-1">Set New Password</h2>
                        <p className="text-slate-500 text-sm">Please security choose a strong password for your account.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="new_password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    id="new_password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 /40 focus:border-indigo-400 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirm_password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Confirm Password
                            </label>
                            <input
                                id="confirm_password"
                                type={showPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 /40 focus:border-indigo-400 transition-all"
                            />
                        </div>

                        {error && (
                            <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                                <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p>{error}</p>
                            </div>
                        )}

                        {message && (
                            <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-sm">
                                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p>{message}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !!message}
                            className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-glow hover:shadow-premium hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                            style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <LoadingSpinner size="sm" color="white" />
                                    <span>Updating...</span>
                                </span>
                            ) : message ? "Updated" : "Update Password"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PasswordResetConfirm;
