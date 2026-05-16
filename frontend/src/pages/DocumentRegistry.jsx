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
            Document <span className="text-primary dark:text-indigo-400">Filing System</span>
          </h1>
          <p className="text-slate-500 font-medium">Securely store and manage invoices, receipts, and operational records.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Form */}
        <div className="lg:col-span-1 glass-card rounded-[2rem] p-6 border border-white/60 shadow-premium h-fit">
          <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Upload New Document</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="form-label block text-sm mb-1">Document Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="form-input w-full px-4 py-2 rounded-xl"
                placeholder="e.g. May 2025 Meds Invoice"
                required
              />
            </div>
            <div>
              <label className="form-label block text-sm mb-1">Document Type</label>
              <select
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                className="form-input w-full px-4 py-2 rounded-xl"
              >
                <option value="invoice">Invoice</option>
                <option value="receipt">Receipt</option>
                <option value="contract">Contract</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label block text-sm mb-1">File</label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-primary hover:file:bg-indigo-100 dark:file:bg-indigo-900/40 dark:file:text-indigo-300"
                required
              />
            </div>
            <div>
              <label className="form-label block text-sm mb-1">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-input w-full px-4 py-2 rounded-xl"
                rows="3"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="w-full btn-primary  text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              {uploading ? "Uploading..." : "Save Document"}
            </button>
          </form>
        </div>

        {/* Document Registry List */}
        <div className="lg:col-span-2 glass-card rounded-[2rem] p-6 border border-white/60 shadow-premium">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Document Archive</h3>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-input px-3 py-1.5 rounded-lg text-sm"
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
                <tr className="table-header-row">
                  <th className="pb-4 pt-2 px-4 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Title & Type</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Uploaded By</th>
                  <th className="pb-4 pt-2 px-4 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Date</th>
                  <th className="pb-4 pt-2 px-4 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                {loading ? (
                  <tr><td colSpan="4" className="py-8 text-center text-gray-400">Loading documents...</td></tr>
                ) : documents.length === 0 ? (
                  <tr><td colSpan="4" className="py-8 text-center text-gray-400">No documents found.</td></tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-colors">
                      <td className="py-4 px-4">
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{doc.title}</p>
                        <span className="data-cell inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md">
                          {doc.document_type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {doc.uploaded_by_name || "Unknown"}
                      </td>
                      <td className="py-4 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {format(new Date(doc.uploaded_at), "MMM dd, yyyy HH:mm")}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <a
                          href={doc.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="brand-mist px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
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
