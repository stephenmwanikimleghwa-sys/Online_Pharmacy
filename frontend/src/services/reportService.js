import api from './api';

const reportService = {
    /**
     * Get inventory trends over time
     * @param {number} days - Number of days to look back (default 30)
     */
    getInventoryTrends: async (days = 30) => {
        try {
            const response = await api.get(`/reports/analytics/inventory_trends/?days=${days}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get pharmacist performance metrics
     */
    getPharmacistPerformance: async () => {
        try {
            const response = await api.get('/reports/analytics/pharmacist_performance/');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get top selling products
     * @param {number} days - Number of days to look back (default 30)
     */
    getTopSellingProducts: async (days = 30) => {
        try {
            const response = await api.get(`/reports/analytics/top_selling_products/?days=${days}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get low stock alerts
     */
    getLowStockAlerts: async () => {
        try {
            const response = await api.get('/reports/analytics/low_stock_alerts/');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Export analytics report as PDF
     * @param {number} days - Number of days to include in the report
     */
    exportPDF: async (days = 30) => {
        try {
            const response = await api.get(`/reports/analytics/export_pdf/?days=${days}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `pharmacy_report_${new Date().toISOString().split('T')[0]}_${Date.now()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            throw error;
        }
    },

    /**
     * Download a receipt for a specific order
     * @param {number} orderId - ID of the order to download receipt for
     */
    getReceiptPDF: async (orderId) => {
        try {
            const response = await api.get(`/orders/${orderId}/receipt/`, {
                responseType: 'blob'
            });

            const contentDisposition = response.headers?.['content-disposition'] ||
                response.headers?.get?.('content-disposition');
            const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
            let filename = filenameMatch?.[1] || `receipt_${orderId}.pdf`;
            const ts = Date.now();
            filename = filename.includes('.pdf') ? filename.replace('.pdf', `_${ts}.pdf`) : `${filename}_${ts}.pdf`;

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            throw error;
        }
    }
};

export default reportService;
