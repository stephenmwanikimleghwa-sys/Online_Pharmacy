// src/services/inventoryService.js

import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

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

export const inventoryService = {
  // Get inventory summary (total products, low stock, out of stock)
  getInventorySummary: () => {
    return api.get("/inventory/summary/");
  },

  // Get all inventory items with pagination and filtering
  getInventory: (params = {}) => {
    return api.get("/inventory/", { params });
  },

  // Get low stock items
  getLowStockItems: () => {
    return api.get("/inventory/low-stock/");
  },

  // Get out of stock items
  getOutOfStockItems: () => {
    return api.get("/inventory/out-of-stock/");
  },

  // Get specific inventory item
  getInventoryItem: (itemId) => {
    return api.get(`/inventory/${itemId}/`);
  },

  // Update inventory item
  updateInventoryItem: (itemId, data) => {
    return api.patch(`/inventory/${itemId}/`, data);
  },

  // Add new inventory item
  addInventoryItem: (data) => {
    return api.post("/inventory/", data);
  },

  // Restock inventory
  restockInventory: (itemId, quantity, reason = "Restock") => {
    return api.post(`/inventory/${itemId}/restock/`, {
      quantity,
      reason,
    });
  },

  // Get stock logs for an item
  getStockLogs: (itemId) => {
    return api.get(`/inventory/${itemId}/logs/`);
  },

  // Request restock (for low stock alerts)
  requestRestock: (itemId, quantityNeeded) => {
    return api.post("/inventory/restock-requests/", {
      product: itemId,
      quantity_needed: quantityNeeded,
      status: "pending",
    });
  },

  // Get all restock requests (for admin/pharmacist)
  getRestockRequests: (status = "pending") => {
    return api.get("/inventory/restock-requests/", {
      params: { status },
    });
  },

  // Update restock request status
  updateRestockRequest: (requestId, status) => {
    return api.patch(`/inventory/restock-requests/${requestId}/`, {
      status,
    });
  },
};

export default inventoryService;
