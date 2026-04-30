import React, { useState, useEffect } from "react";
import api from "../services/api";
import { format } from "date-fns";
import toast from "react-hot-toast";

const DocumentRegistry = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    document_type: "invoice",
    notes: "",
    file: null
  });

  useEffect(() => {
    fetchDocuments();
  }, [filter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const endpoint = filter ? `/inventory/documents/?type=${filter}` : `/inventory/documents/`;
      const response = await api.get(endpoint);
      setDocuments(response.data?.results || response.data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!formData.file || !formData.title) {
      toast.error("Please provide a title and select a file.");
      return;
    }
    
    const data = new FormData();
    data.append("title", formData.title);
    data.append("document_type", formData.document_type);
    data.append("notes", formData.notes);
    data.append("file", formData.file);

    try {
      setUploading(true);
      await api.post("/inventory/documents/", data, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Document uploaded successfully");
      setFormData({ title: "", document_type: "invoice", notes: "", file: null });
      document.getElementById('file-upload').value = "";
      fetchDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-slate-900 tracking-tight dark:text-white">
            Document <span className="text-indigo-600 dark:text-indigo-400">Filing System</span>
          </h1>
          <p className="text-slate-500 font-medium">Securely store and manage invoices, receipts, and operational records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <div className="lg:col-span-1 glass-card rounded-[2rem] p-6 border border-white/60 dark:border-gray-800 shadow-premium h-fit">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Upload New Document</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g. May 2025 Meds Invoice"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Type</label>
              <select
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="invoice">Invoice</option>
                <option value="receipt">Receipt</option>
                <option value="contract">Contract</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File</label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-300"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows="3"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              {uploading ? "Uploading..." : "Save Document"}
            </button>
          </form>
        </div>

        {/* Document Registry List */}
        <div className="lg:col-span-2 glass-card rounded-[2rem] p-6 border border-white/60 dark:border-gray-800 shadow-premium">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Document Archive</h3>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="invoice">Invoices</option>
              <option value="receipt">Receipts</option>
              <option value="contract">Contracts</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-gray-500 uppercase">Title & Type</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-gray-500 uppercase">Uploaded By</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="pb-4 pt-2 px-4 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {loading ? (
                  <tr><td colSpan="4" className="py-8 text-center text-gray-400">Loading documents...</td></tr>
                ) : documents.length === 0 ? (
                  <tr><td colSpan="4" className="py-8 text-center text-gray-400">No documents found.</td></tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{doc.title}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold uppercase rounded-md">
                          {doc.document_type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {doc.uploaded_by_name || "Unknown"}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(doc.uploaded_at), "MMM dd, yyyy HH:mm")}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <a
                          href={doc.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-800/60 rounded-lg text-xs font-bold uppercase"
                        >
                          View / DL
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentRegistry;
