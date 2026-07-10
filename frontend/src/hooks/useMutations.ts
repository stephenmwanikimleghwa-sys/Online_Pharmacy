import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { queryClient } from '../lib/queryClient';
import { QUERY_KEYS } from '../lib/queryKeys';

/**
 * Mark large catalogue caches as stale WITHOUT immediately re-fetching.
 * The next mount / manual refetch will pick up fresh data.
 * This prevents the "slow reload" after every sale/intake/edit.
 */
const markInventoryStale = () => {
  void queryClient.invalidateQueries({ queryKey: ['inventory'], refetchType: 'none' });
  void queryClient.invalidateQueries({ queryKey: ['products'],  refetchType: 'none' });
  void queryClient.invalidateQueries({ queryKey: ['stock'],     refetchType: 'none' });
};

export function useCreateSale() {
  return useMutation({
    mutationFn: (saleData: unknown) => api.post('/inventory/dispense/otc/', saleData),
    onSuccess: () => {
      markInventoryStale();
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['logs', 'dispensing'] });
      void queryClient.invalidateQueries({ queryKey: ['dispensations'] });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useCreateStockIntake() {
  return useMutation({
    mutationFn: (intakeData: { branch?: number; [key: string]: unknown }) =>
      api.post('/inventory/stock-intake/', intakeData),
    onSuccess: (_data, variables) => {
      const branchId = variables.branch;
      markInventoryStale();
      if (branchId) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expiryAlerts(branchId) });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lowStockAlerts(branchId) });
      }
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['stockIntakes'] });
    },
  });
}

export function useApproveTransfer() {
  return useMutation({
    mutationFn: (transferId: number) =>
      api.post(`/inventory/transfers/${transferId}/approve/`),
    onSuccess: () => {
      markInventoryStale();
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
  });
}

export function useCreateProduct() {
  return useMutation({
    mutationFn: (productData: unknown) => api.post('/products/', productData),
    onSuccess: () => {
      markInventoryStale();
    },
  });
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) =>
      api.patch(`/products/${id}/`, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productDetail(variables.id) });
      markInventoryStale();
    },
  });
}

export function useRecordDebtPayment() {
  return useMutation({
    mutationFn: ({
      customerId,
      paymentData,
    }: {
      customerId: number;
      paymentData: unknown;
    }) => api.post(`/auth/customers/${customerId}/payments/`, paymentData),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customerDetail(variables.customerId),
      });
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.customerDebtHistory(variables.customerId),
      });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRecordSupplierPayment() {
  return useMutation({
    mutationFn: ({
      supplierId,
      paymentData,
    }: {
      supplierId: number;
      paymentData: unknown;
    }) => api.post(`/inventory/suppliers/${supplierId}/record_payment/`, paymentData),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.supplierDetail(variables.supplierId),
      });
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.supplierTransactions(variables.supplierId),
      });
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useDeactivateUser() {
  return useMutation({
    mutationFn: (userId: number) =>
      api.patch(`/auth/admin/users/${userId}/`, { is_active: false }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useAdjustStock() {
  return useMutation({
    mutationFn: (adjustmentData: { product_id: number; [key: string]: unknown }) =>
      api.post(`/inventory/${adjustmentData.product_id}/adjust/`, adjustmentData),
    onSuccess: () => {
      markInventoryStale();
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useMarkStockExpired() {
  return useMutation({
    mutationFn: (batchId: number) =>
      api.post(`/inventory/expiry/batches/${batchId}/remove/`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expiry'] });
      markInventoryStale();
    },
  });
}

export function useCreatePurchaseOrder() {
  return useMutation({
    mutationFn: (orderData: unknown) => api.post('/purchase-orders/', orderData),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });
}

export function useUpdatePurchaseOrder() {
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) =>
      api.patch(`/purchase-orders/${id}/`, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.purchaseOrderDetail(variables.id),
      });
      void queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });
}

export function useRejectTransfer() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post(`/inventory/transfers/${id}/reject/`, { reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transfers'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      markInventoryStale();
    },
  });
}
