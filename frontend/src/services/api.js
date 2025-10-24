import axios from "axios";

console.log("[API Debug] Initializing API client...");

// ✅ Use environment variable for base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ✅ Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Optional health check (custom)
export const checkAPIHealth = async () => {
  try {
    const response = await api.get("/products/"); // Use a real endpoint that exists
    console.log("[Health Debug] API reachable ✅");
    return true;
  } catch (error) {
    console.error("[Health Debug] API not reachable ❌", error);
    return false;
  }
};

//
// ====================== AUTH ======================
//

export const registerCustomer = (data) => api.post("/auth/register/", data);
export const registerPharmacist = (data) => api.post("/auth/pharmacist-register/", data);
export const loginUser = (data) => api.post("/auth/login/", data);
export const changePassword = (data) => api.post("/auth/change-password/", data);
export const getProfile = () => api.get("/auth/profile/");
export const updateProfile = (data) => api.put("/auth/profile/", data);

//
// ====================== PRODUCTS ======================
//

export const getProducts = () => api.get("/products/");
export const getFeaturedProducts = () => api.get("/products/featured/");
export const getProduct = (id) => api.get(`/products/${id}/`);
export const createProduct = (data) => api.post("/products/", data);
export const updateProduct = (id, data) => api.put(`/products/${id}/`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}/`);

//
// ====================== ORDERS ======================
//

export const getOrders = () => api.get("/orders/");
export const getMyOrders = () => api.get("/orders/my-orders/");
export const createOrder = (data) => api.post("/orders/", data);
export const updateOrder = (id, data) => api.put(`/orders/${id}/`, data);
export const deleteOrder = (id) => api.delete(`/orders/${id}/`);

//
// ====================== PRESCRIPTIONS ======================
//

export const getPrescriptions = () => api.get("/prescriptions/");
export const uploadPrescription = (data) => api.post("/prescriptions/upload/", data);
export const addPrescription = (data) => api.post("/prescriptions/add/", data);
export const getPendingPrescriptions = () => api.get("/prescriptions/pharmacist/pending/");
export const getDispensedPrescriptions = () => api.get("/prescriptions/pharmacist/dispensed/");
export const verifyPrescription = (id) => api.post(`/prescriptions/${id}/verify/`);
export const dispensePrescription = (id, data) => api.post(`/prescriptions/${id}/dispense/`, data);

//
// ====================== PAYMENTS ======================
//

export const initiateMpesaPayment = (data) => api.post("/payments/mpesa/initiate/", data);
export const initiateStripePayment = (data) => api.post("/payments/stripe/initiate/", data);
export const getPaymentStatus = (id) => api.get(`/payments/${id}/status/`);
export const getMyPayments = () => api.get("/payments/my-payments/");

//
// ====================== INVENTORY ======================
//

export const getInventory = () => api.get("/inventory/");
export const getLowStock = () => api.get("/inventory/low-stock/");
export const getOutOfStock = () => api.get("/inventory/out-of-stock/");
export const getInventorySummary = () => api.get("/inventory/summary/");
export const restockItem = (id, data) => api.post(`/inventory/${id}/restock/`, data);

//
// ====================== REVIEWS ======================
//

export const getReviews = () => api.get("/reviews/");
export const createReview = (data) => api.post("/reviews/", data);
export const getProductReviews = (productId) => api.get(`/reviews/product/${productId}/`);
export const getReviewSummary = (productId) => api.get(`/reviews/product/${productId}/summary/`);
export const updateReview = (id, data) => api.put(`/reviews/${id}/`, data);
export const deleteReview = (id) => api.delete(`/reviews/${id}/`);

//
// ====================== EXPORT DEFAULT ======================
//

export default api;
