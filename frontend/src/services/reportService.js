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
            console.error('Error fetching inventory trends:', error);
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
            console.error('Error fetching pharmacist performance:', error);
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
            console.error('Error fetching top selling products:', error);
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
            console.error('Error fetching low stock alerts:', error);
            throw error;
        }
    }
};

export default reportService;
