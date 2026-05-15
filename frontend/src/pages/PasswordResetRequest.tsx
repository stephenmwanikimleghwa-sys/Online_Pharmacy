import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { ExclamationCircleIcon, CheckCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from '../components/LoadingSpinner';

const PasswordResetRequest: React.FC = () => {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await api.post("/auth/password-reset/", { email });
            setMessage(response.data.message || "Reset link sent!");
        } catch (err: any) {
            setError(err.response?.data?.email?.[0] || err.response?.data?.detail || "Failed to send reset link.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-6 py-12"
            style={{ background: "linear-gradient(135deg, #eef2ff 0%, #faf5ff 50%, #ecfdf5 100%)" }}>
            <div className="w-full max-w-md">
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-premium border border-white/70 p-8">
                    <button
                        onClick={() => navigate("/login")}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-8 text-sm font-semibold"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Login
                    </button>

                    <div className="mb-8">
                        <h2 className="text-3xl font-display font-bold text-slate-900 mb-1">Reset Password</h2>
                        <p className="text-slate-500 text-sm">Enter your email and we'll send you a reset link.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
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
                                    <span>Sending...</span>
                                </span>
                            ) : message ? "Link Sent" : "Send Reset Link"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PasswordResetRequest;
