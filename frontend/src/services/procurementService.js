import api from './api';

export const compareSupplierPrices = (productId) =>
  api.get('/inventory/suppliers/compare/', { params: { product_id: productId } });

export const getLastPrice = (productId, supplierId) =>
  api.get('/inventory/suppliers/last-price/', {
    params: { product_id: productId, supplier_id: supplierId },
  });

export const getSupplierProducts = (supplierId) =>
  api.get(`/inventory/suppliers/${supplierId}/products-supplied/`);

export const getSupplierScorecard = (supplierId) =>
  api.get(`/inventory/suppliers/${supplierId}/scorecard/`);

export const getProcurementAnalytics = () =>
  api.get('/inventory/suppliers/procurement-analytics/');

export const listPurchaseOrders = (params = {}) =>
  api.get('/purchase-orders/', { params });

export const createPurchaseOrder = (data) =>
  api.post('/purchase-orders/', data);

export const updatePurchaseOrder = (id, data) =>
  api.patch(`/purchase-orders/${id}/`, data);

export const markPurchaseOrderSent = (id) =>
  api.post(`/purchase-orders/${id}/mark-sent/`);

export const cancelPurchaseOrder = (id, reason) =>
  api.post(`/purchase-orders/${id}/cancel/`, { reason });

export const getPurchaseOrderReceivePrefill = (id) =>
  api.get(`/purchase-orders/${id}/receive/`);

export const receivePurchaseOrder = (id, data) =>
  api.post(`/purchase-orders/${id}/receive/`, data);

export const getExpirySummary = () =>
  api.get('/inventory/expiry/summary/');

export const checkProductExpiry = (productId) =>
  api.get(`/inventory/expiry/check/${productId}/`);

export const markBatchRemoved = (batchId) =>
  api.post(`/inventory/expiry/batches/${batchId}/remove/`);

export const setBatchClearance = (batchId, clearancePrice) =>
  api.post(`/inventory/expiry/batches/${batchId}/clearance/`, {
    clearance_price: clearancePrice,
  });

export const createTransferRequest = (data) =>
  api.post('/inventory/transfers/', data);

export const approveTransfer = (id) =>
  api.post(`/inventory/transfers/${id}/approve/`);

export const rejectTransfer = (id, reason) =>
  api.post(`/inventory/transfers/${id}/reject/`, { reason });

export const getProductAvailability = (productId) =>
  api.get(`/products/${productId}/availability/`);
