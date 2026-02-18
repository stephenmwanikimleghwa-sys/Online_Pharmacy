import api from './api';

const pharmacyService = {
    /**
     * Get all documents for the authenticated pharmacist's pharmacy
     */
    getDocuments: async () => {
        try {
            const response = await api.get('/users/documents/');
            return response.data;
        } catch (error) {
            console.error('Error fetching pharmacy documents:', error);
            throw error;
        }
    },

    /**
     * Upload a new document
     * @param {FormData} formData - FormData containing title, document_type, file, and expiry_date
     */
    uploadDocument: async (formData) => {
        try {
            const response = await api.post('/users/documents/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error uploading document:', error);
            throw error;
        }
    },

    /**
     * Delete a document
     * @param {number} documentId - ID of the document to delete
     */
    deleteDocument: async (documentId) => {
        try {
            const response = await api.delete(`/users/documents/${documentId}/`);
            return response.data;
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    }
};

export default pharmacyService;
