import api from './api';

const getSalesReport = async (params = {}) => {
  const response = await api.get('/reports/hub/sales_report/', { params });
  return response.data;
};

const getStockValuation = async (params = {}) => {
  const response = await api.get('/reports/hub/stock_valuation/', { params });
  return response.data;
};

const getExpiryReport = async (params = {}) => {
  const response = await api.get('/reports/hub/expiry_report/', { params });
  return response.data;
};

const getStaffActivity = async (params = {}) => {
  const response = await api.get('/reports/hub/staff_activity/', { params });
  return response.data;
};

const reportsHubService = {
  getSalesReport,
  getStockValuation,
  getExpiryReport,
  getStaffActivity,
};

export default reportsHubService;
