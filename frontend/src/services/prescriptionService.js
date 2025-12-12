// pharmacy-aggregator/frontend/src/services/prescriptionService.js
// src/services/prescriptionService.js
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const prescriptionService = {
  // Get pending prescriptions for pharmacist verification
  getPendingPrescriptions: () => {
    return api.get("/prescriptions/pharmacist/pending/");
  },

  // Get dispensed prescriptions
  getDispensedPrescriptions: () => {
    return api.get("/prescriptions/pharmacist/dispensed/");
  },

  // Validate a prescription
  validatePrescription: (prescriptionId, notes = "") => {
    return api.post(`/prescriptions/${prescriptionId}/verify/`, {
      status: "verified",
      notes,
    });
  },

  // Reject a prescription
  rejectPrescription: (prescriptionId, reason) => {
    return api.post(`/prescriptions/${prescriptionId}/verify/`, {
      status: "rejected",
      notes: reason,
    });
  },

  // Dispense a prescription
  dispensePrescription: (prescriptionId) => {
    return api.post(`/prescriptions/${prescriptionId}/dispense/`);
  },

  // Add new prescription (manual entry by pharmacist)
  addPrescription: (prescriptionData) => {
    return api.post("/prescriptions/add/", prescriptionData);
  },

  // Get prescription details
  getPrescription: (prescriptionId) => {
    return api.get(`/prescriptions/${prescriptionId}/`);
  },

  // Get all prescriptions for admin view
  getAllPrescriptions: () => {
    return api.get("/prescriptions/admin/");
  },

  // Update prescription status
  updatePrescriptionStatus: (prescriptionId, status, notes = "") => {
    return api.patch(`/prescriptions/${prescriptionId}/`, {
      status,
      notes,
    });
  },

  // Get daily prescription stats
  getDailyPrescriptions: async (dateRange) => {
    // TODO: Implement backend endpoint for daily stats
    // For now returning empty array to prevent crash
    return { data: [] };
  },

  // Get dispensed medicines stats
  getDispensedMedicines: async (dateRange) => {
    try {
      const response = await api.get("/inventory/stats/dispensing/", { params: dateRange });
      // Map backend format to frontend expected format
      const mappedData = (response.data.top_products || []).map(item => ({
        name: item.product__name,
        quantity: item.total_quantity,
        totalValue: item.total_revenue
      }));
      return { data: mappedData };
    } catch (error) {
      console.error("Error fetching dispensed medicines:", error);
      return { data: [] };
    }
  },
};

//export { getPendingPrescriptions, getDispensedPrescriptions };
export const getPendingPrescriptions = () => {
  return prescriptionService.getPendingPrescriptions();
};

export const getDispensedPrescriptions = () => {
  return prescriptionService.getDispensedPrescriptions();
};

export default prescriptionService;
