export const QUERY_KEYS = {
  currentUser: ['auth', 'currentUser'],
  branches: ['branches'],
  activeBranch: ['branches', 'active'],
  pharmacyProfile: ['pharmacy', 'profile'],
  products: (branchId?: number, filters?: object) =>
    ['products', { branchId, ...filters }],
  inventory: (branchId?: number, filters?: object) =>
    ['inventory', { branchId, ...filters }],
  productDetail: (id: number) => ['products', id],
  productAvailability: (id: number) => ['products', id, 'availability'],
  productSearch: (term: string, branchId?: number, context?: string) =>
    ['products', 'search', { term, branchId, context }],
  branchStock: (branchId: number) => ['stock', 'branch', branchId],
  stockLogs: (branchId?: number) => ['stock', 'logs', branchId],
  stockValuation: (branchId: number) => ['stock', 'valuation', branchId],
  lowStockAlerts: (branchId: number) => ['stock', 'alerts', 'low', branchId],
  expiryAlerts: (branchId: number) => ['expiry', 'alerts', branchId],
  expiryReport: (branchId: number, window: string) =>
    ['expiry', 'report', branchId, window],
  batches: (productId: number, branchId: number) =>
    ['batches', productId, branchId],
  suppliers: ['suppliers'],
  supplierDetail: (id: number) => ['suppliers', id],
  supplierProducts: (id: number) => ['suppliers', id, 'products'],
  supplierCompare: (productId: number) => ['suppliers', 'compare', productId],
  supplierScorecard: (id: number) => ['suppliers', id, 'scorecard'],
  supplierTransactions: (id: number) => ['suppliers', id, 'transactions'],
  customers: ['customers'],
  customerDetail: (id: number) => ['customers', id],
  customerDebtHistory: (id: number) => ['customers', id, 'debt'],
  dispensations: (branchId?: number, filters?: object) =>
    ['dispensations', { branchId, ...filters }],
  dispensationDetail: (id: number) => ['dispensations', id],
  purchaseOrders: (branchId?: number) => ['purchaseOrders', branchId],
  purchaseOrderDetail: (id: number) => ['purchaseOrders', id],
  dashboardGlobal: ['dashboard', 'global'],
  dashboardBranch: (branchId: number) => ['dashboard', 'branch', branchId],
  procurementAnalytics: ['reports', 'procurement'],
  salesReport: (filters: object) => ['reports', 'sales', filters],
  users: ['users'],
  userDetail: (id: number) => ['users', id],
  staffActivityLogs: (filters?: object) => ['logs', 'activity', filters],
  dispensingLogs: (filters?: object) => ['logs', 'dispensing', filters],
  transfers: (branchId?: number, filters?: object) =>
    ['transfers', { branchId, ...filters }],
  restockRequests: (status?: string) => ['restockRequests', status],
  stockIntakes: (filters?: object) => ['stockIntakes', filters],
};
