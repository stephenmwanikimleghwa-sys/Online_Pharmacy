import React, { useState, useEffect } from 'react';
import {
    CloudArrowUpIcon as UploadIcon,
    DocumentTextIcon as DocIcon,
    TrashIcon,
    ExclamationTriangleIcon as WarningIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import pharmacyService from '../services/pharmacyService';
import { format } from 'date-fns';

const PharmacyLicensing = () => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        document_type: 'license',
        expiry_date: '',
        file: null
    });

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await pharmacyService.getDocuments();
            setDocuments(Array.isArray(data) ? data : []);
        } catch (err) {
            const status = err.response?.status;
            const detail = err.response?.data?.detail;
            let message = 'Could not load your documents. Please try again.';
            if (status === 401 || status === 403) {
                message = 'You do not have permission to view these documents. Please log in as a pharmacist or admin.';
            } else if (status === 404) {
                message = 'Documents endpoint not found. Please contact your system administrator.';
            } else if (detail && typeof detail === 'string') {
                message = detail;
            } else if (!navigator.onLine) {
                message = 'You appear to be offline. Please check your internet connection and try again.';
            } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
                message = 'The request timed out. The server may be starting up — please wait a moment and try again.';
            }
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, file: e.target.files[0] });
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!formData.file || !formData.title) return;

        setUploading(true);
        const data = new FormData();
        data.append('title', formData.title);
        data.append('document_type', formData.document_type);
        data.append('file', formData.file);
        if (formData.expiry_date) data.append('expiry_date', formData.expiry_date);

        try {
            await pharmacyService.uploadDocument(data);
            setFormData({ title: '', document_type: 'license', expiry_date: '', file: null });
            fetchDocuments();
        } catch (err) {
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            await pharmacyService.deleteDocument(id);
            setDocuments(documents.filter(doc => doc.id !== id));
        } catch (err) {
            setError('Failed to delete document.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="mb-12">
                <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight">Licensing & Permits</h1>
                <p className="text-slate-500 mt-2 text-lg">Manage and track your pharmacy's legal documentation and compliance status.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Upload Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-card border border-slate-100 h-fit sticky top-8">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <UploadIcon className="w-6 h-6 text-primary" />
                            Upload Document
                        </h3>

                        <form onSubmit={handleUpload} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Document Title</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Health Ops Permit 2026"
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
                                <select
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold"
                                    value={formData.document_type}
                                    onChange={e => setFormData({ ...formData, document_type: e.target.value })}
                                >
                                    <option value="license">Pharmacy License</option>
                                    <option value="permit">Operational Permit</option>
                                    <option value="insurance">Insurance Certificate</option>
                                    <option value="compliance">Compliance Certificate</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Expiry Date</label>
                                <input
                                    type="date"
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-semibold"
                                    value={formData.expiry_date}
                                    onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">File (PDF or Image)</label>
                                <div className="relative group border-2 border-dashed border-slate-200 rounded-2xl p-6 hover:border-indigo-400 hover:bg-slate-50 transition-all cursor-pointer">
                                    <input
                                        type="file"
                                        required
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                    <div className="text-center">
                                        <DocIcon className="w-10 h-10 text-slate-300 group-hover:text-primary mx-auto mb-3" />
                                        <p className="text-sm font-bold text-slate-500 group-hover:text-slate-700">
                                            {formData.file ? formData.file.name : 'Click or drop to upload'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={uploading}
                                className={`w-full py-5 rounded-2xl text-white font-display font-bold text-lg shadow-soft transition-all active:scale-[0.98] 
                  ${uploading ? 'bg-slate-400 cursor-not-allowed' : 'btn-primary hover:shadow-glow hover:opacity-95'}`}
                            >
                                {uploading ? 'Uploading...' : 'Upload Document'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Documents List */}
                <div className="lg:col-span-2">
                    {error && (
                        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 p-5 rounded-2xl animate-fade-in">
                            <div className="flex items-start gap-4">
                                <WarningIcon className="w-6 h-6 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-bold text-sm mb-1">Could not load documents</p>
                                    <p className="text-sm text-rose-600">{error}</p>
                                </div>
                            </div>
                            <button
                                onClick={fetchDocuments}
                                className="mt-4 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all uppercase tracking-widest"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-slate-100 animate-pulse h-48 rounded-[2rem]" />
                            ))}
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2.5rem] py-24 text-center">
                            <DocIcon className="w-20 h-20 text-slate-200 mx-auto mb-6" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest">No documents uploaded yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {documents.map((doc) => (
                                <div key={doc.id} className="group relative bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-card hover:border-indigo-100 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-indigo-50 rounded-2xl group-hover:btn-primary transition-colors">
                                            <DocIcon className="w-8 h-8 text-primary group-hover:text-white" />
                                        </div>
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors mb-2 line-clamp-1">{doc.title}</h3>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full">{doc.document_type}</span>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                                            {doc.is_expired ? (
                                                <div className="flex items-center gap-1.5 text-rose-600 font-bold text-xs">
                                                    <WarningIcon className="w-4 h-4" /> Expired
                                                </div>
                                            ) : doc.is_verified ? (
                                                <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                                    <CheckCircleIcon className="w-4 h-4" /> Verified
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs">
                                                    Pending Review
                                                </div>
                                            )}
                                        </div>

                                        {doc.expiry_date && (
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Expires</p>
                                                <p className={`text-xs font-bold ${doc.is_expired ? 'text-rose-600' : 'text-slate-700'}`}>
                                                    {format(new Date(doc.expiry_date), 'MMM dd, yyyy')}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <a
                                        href={doc.file}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-6 block w-full text-center py-3.5 bg-slate-50 text-slate-600 font-bold text-sm rounded-xl hover:bg-indigo-50 hover:text-primary transition-all border border-transparent hover:border-indigo-100"
                                    >
                                        View Document
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PharmacyLicensing;
