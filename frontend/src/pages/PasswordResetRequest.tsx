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
        <div className="page-bg flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="glass-card p-8">
                    <button
                        onClick={() => navigate("/login")}
                        className="flex items-center gap-2 mb-8 text-sm font-semibold transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to Login
                    </button>

                    <div className="mb-8">
                        <h2 className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enter your email and we'll send you a reset link.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="form-label">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="form-input"
                            />
                        </div>

                        {error && (
                            <div className="alert-error">
                                <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p>{error}</p>
                            </div>
                        )}

                        {message && (
                            <div className="alert-success">
                                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p>{message}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !!message}
                            className="btn-primary w-full py-3 px-4 rounded-xl text-white font-semibold text-sm hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
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
