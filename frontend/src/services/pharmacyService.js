import api from './api';

const pharmacyService = {
    /**
     * Get all documents for the authenticated pharmacist's pharmacy
     */
    getDocuments: async () => {
        const response = await api.get('/auth/documents/');
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        return [];
    },

    /**
     * Upload a new document
     * @param {FormData} formData - FormData containing title, document_type, file, and expiry_date
     */
    uploadDocument: async (formData) => {
        const response = await api.post('/auth/documents/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    /**
     * Delete a document
     * @param {number} documentId - ID of the document to delete
     */
    deleteDocument: async (documentId) => {
        const response = await api.delete(`/auth/documents/${documentId}/`);
        return response.data;
    }
};

export default pharmacyService;
