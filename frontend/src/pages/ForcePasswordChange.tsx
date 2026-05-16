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
        <div className="page-bg flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md">
                <div className="glass-card p-8">
                    <div className="mb-8 text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                            style={{ background: 'var(--brand-mist)', color: 'var(--color-primary)' }}>
                            <ShieldCheckIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-display font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Security Update</h2>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>For your security, you must change your password before continuing.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="form-label">Current Password</label>
                            <div className="relative">
                                <input
                                    name="oldPassword"
                                    type={showPasswords.old ? "text" : "password"}
                                    required
                                    value={passwords.oldPassword}
                                    onChange={handleChange}
                                    className="form-input pr-11"
                                    placeholder="Enter current password"
                                />
                                <button type="button" onClick={() => setShowPasswords(p => ({ ...p, old: !p.old }))}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    {showPasswords.old ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="form-label">New Password</label>
                            <div className="relative">
                                <input
                                    name="newPassword"
                                    type={showPasswords.new ? "text" : "password"}
                                    required
                                    value={passwords.newPassword}
                                    onChange={handleChange}
                                    className="form-input pr-11"
                                    placeholder="Enter new password"
                                />
                                <button type="button" onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    {showPasswords.new ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Confirm New Password</label>
                            <div className="relative">
                                <input
                                    name="confirmPassword"
                                    type={showPasswords.confirm ? "text" : "password"}
                                    required
                                    value={passwords.confirmPassword}
                                    onChange={handleChange}
                                    className="form-input pr-11"
                                    placeholder="Confirm new password"
                                />
                                <button type="button" onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                                    style={{ color: 'var(--text-secondary)' }}>
                                    {showPasswords.confirm ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="alert-error">
                                <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <p>{error}</p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full py-3 px-4 rounded-xl text-white font-semibold text-sm transition-all"
                            >
                                {loading ? "Updating..." : "Update Password & Continue"}
                            </button>
                            <button
                                type="button"
                                onClick={logout}
                                className="form-cancel-btn w-full py-3 px-4 text-center"
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
