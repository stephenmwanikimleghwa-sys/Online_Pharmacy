// src/services/inventoryService.js

import api from './api';

export const inventoryService = {
  // Get inventory summary (total products, low stock, out of stock)
  getInventorySummary: (params = {}) => {
    return api.get("/inventory/summary/", {
      params,
      skipGlobalErrorNotification: true,
    });
  },

  // Get all inventory items with pagination and filtering
  getInventory: async (params = {}) => {
    try {
      // Check authentication state
      const token = localStorage.getItem("access_token");
      console.log('[Inventory Service] Auth check:', {
        hasToken: !!token,
        tokenStart: token ? token.substring(0, 10) + '...' : 'none'
      });

      if (!token) {
        console.error('[Inventory Service] No auth token found');
        // Let the shared api/interceptor handle redirect; still throw so callers can react
        const err = new Error('Authentication required');
        err.response = { status: 401 };
        throw err;
      }

      // Make the request to the inventory list endpoint using the shared api client
      console.log('[Inventory Service] Fetching inventory from list endpoint');
      const response = await api.get('/inventory/list/', {
        params,
        skipGlobalErrorNotification: true,
      });

      // Log successful response
      console.log('[Inventory Service] Inventory fetched successfully:', {
        status: response.status,
        itemCount: response.data?.products?.length || 0,
        totalItems: response.data?.totalItems || 0
      });

      return response;
    } catch (error) {
      // Enhanced error logging
      console.error('[Inventory Service] Failed to fetch inventory:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        stack: error.stack
      });

      // If unauthorized, log and rethrow so callers can stop polling or redirect
      if (error.response?.status === 401) {
        console.warn('[Inventory Service] Auth token invalid or expired');
      }

      throw error;
    }
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
  requestRestock: (itemId, quantityNeeded, currentQuantity = null, notes = '') => {
    // Use the serializer's expected field names
    const payload = {
      product: itemId,
      requested_quantity: quantityNeeded,
      status: "pending",
    };
    if (currentQuantity !== null) payload.current_quantity = currentQuantity;
    if (notes) payload.notes = notes;

    return api.post("/inventory/restock-requests/", payload);
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

  // --- Supplier Management ---
  getSuppliers: (params = {}) => {
    return api.get('/inventory/suppliers/', { params });
  },

  getSupplier: (id) => {
    return api.get(`/inventory/suppliers/${id}/`);
  },

  createSupplier: (data) => {
    return api.post('/inventory/suppliers/', data);
  },

  updateSupplier: (id, data) => {
    return api.patch(`/inventory/suppliers/${id}/`, data);
  },

  deleteSupplier: (id) => {
    return api.delete(`/inventory/suppliers/${id}/`);
  },

  // --- Batch Management ---
  getBatches: (params = {}) => {
    return api.get('/inventory/batches/', { params });
  },

  getBatch: (id) => {
    return api.get(`/inventory/batches/${id}/`);
  },

  // Get stock usage stats
  getStockUsage: async (dateRange) => {
    // TODO: Implement backend endpoint for stock usage
    // For now returning empty array to prevent crash
    return { data: [] };
  },

  // --- Inter-branch transfers ---
  getTransfers: (params = {}) => {
    return api.get('/inventory/transfers/', { params });
  },

  createTransfer: (data) => {
    return api.post('/inventory/transfers/', data);
  },

  approveTransfer: (id) => {
    return api.post(`/inventory/transfers/${id}/approve/`);
  },

  completeTransfer: (id) => {
    return api.post(`/inventory/transfers/${id}/complete/`);
  },
};

export default inventoryService;
