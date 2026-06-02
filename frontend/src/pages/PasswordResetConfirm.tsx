import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from '../components/LoadingSpinner';
import { extractStructuredError } from "../utils/apiErrorDisplay";

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
            const structured = extractStructuredError(err.response?.data);
            setError(
                structured?.message ||
                err.response?.data?.error ||
                err.response?.data?.detail ||
                "Failed to reset password. Link may be expired.",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-bg flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="glass-card p-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Set New Password</h2>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Please choose a strong password for your account.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="new_password" className="form-label">New Password</label>
                            <div className="relative">
                                <input
                                    id="new_password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    className="form-input pr-11"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                                    style={{ color: 'var(--text-secondary)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                                >
                                    {showPassword ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirm_password" className="form-label">Confirm Password</label>
                            <input
                                id="confirm_password"
                                type={showPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="form-input"
                            />
                        </div>

                        {error && (
                            <div className="alert-error">
                                <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p>{typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}</p>
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
