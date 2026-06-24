# Cleanup Report — June 2026

## Files deleted (17)

| File | Reason |
|------|--------|
| `backend/inventory/views.py` | Legacy duplicate; active code in `inventory/views/inventory.py` |
| `frontend/src/contexts/AuthContext.jsx` | Duplicate of `context/AuthContext.tsx` |
| `frontend/src/components/Header.jsx` | Orphan; broken context imports |
| `frontend/src/components/InventoryItemCard.jsx` | Replaced by inline inventory UI |
| `frontend/src/components/navbar/DesktopNav.jsx` | Unused |
| `frontend/src/components/navbar/UserMenu.jsx` | Unused |
| `frontend/src/components/Login.jsx` | Replaced by `pages/Login.tsx` |
| `frontend/src/components/Register.jsx` | No route |
| `frontend/src/pages/Cart.jsx` | Not routed |
| `frontend/src/pages/Checkout.jsx` | Not routed |
| `frontend/src/pages/Register.jsx` | Not routed |
| `frontend/src/pages/PricingManagement.jsx` | Not routed |
| `frontend/src/pages/Pharmacies.jsx` | Not routed |
| `frontend/src/pages/PharmaciesDirectory.jsx` | Not routed |
| `frontend/src/pages/PrescriptionUpload.jsx` | Not routed |
| `frontend/src/pages/Reports/Dashboard.jsx` | Superseded by `ReportsDashboard` |
| `frontend/src/pages/ProductListings.jsx` | Not routed |
| `frontend/src/pages/AdminStock.jsx.new` | Dead duplicate |

## Console / debug removal

- **console statements removed:** ~90 across 38 frontend files
- **Remaining (intentional):** `ErrorBoundary.tsx`, `main.jsx` unhandled-rejection handler
- **print() removed from production:** `backend/utils/cache.py` (1)
- **print() remaining:** test scripts, seed scripts, migrations only (not production paths)
- **Auth debug:** `logAuthError` removed from `AuthContext.tsx`

## React Query foundation

### New files
- `src/lib/queryClient.ts`, `queryKeys.ts`, `staleTimes.ts`, `prefetchOnLogin.ts`
- `src/hooks/useBranches.ts`, `useProducts.ts`, `useSuppliers.ts`, `useCustomers.ts`
- `src/hooks/useDashboard.ts`, `useExpiryAlerts.ts`, `useDispensing.ts`
- `src/hooks/usePurchaseOrders.ts`, `useUsers.ts`, `useMutations.ts`
- `src/hooks/usePrefetchOnHover.ts`, `useActiveBranch.ts`, `useDocumentTitle.ts`
- `src/hooks/useInventoryExtras.ts` (transfers, restock requests, stock intakes)
- `src/components/ui/RefreshIndicator.tsx`

### Provider order (`main.jsx`)
`QueryClientProvider` → `BrowserRouter` → `ThemeProvider` → `AuthProvider` → `CartProvider` → `NotificationProvider` → `App`

### Session persistence
- `@tanstack/react-query-persist-client` + `@tanstack/query-sync-storage-persister`
- `sessionStorage` key `TRANSCOUNTY_QUERY_CACHE`, 30 min max age
- Cache bust via `VITE_APP_VERSION`

## Components refactored to React Query

| Component | Hooks used |
|-----------|------------|
| `AdminDashboard.jsx` | `useDashboardGlobal`, `useDashboardBranch`, `useLowStockAlerts`, `useExpiryAlerts` |
| `PharmacistDashboard.jsx` | `useDashboardBranch`, `useLowStockAlerts`, `useExpiryAlerts`, `useInventoryList` |
| `ExpiryAlertsWidget.jsx` | `useExpiryAlerts` |
| `ManageUsers.jsx` | `useUsers`, `useBranches` |
| `Customers.jsx` | `useCustomers` |
| `SupplierList.jsx` | `useSuppliers` |
| `InventoryManagement.jsx` | `useInventoryList` |

### Prefetch
- Login / branch switch / branch selection screen → `prefetchOnLogin()`
- Sidebar hover → inventory, suppliers, customers, reports, logs, users

## Backend caching

- `backend/utils/cached_view.py` — `cached_view()` helper
- `backend/inventory/signals.py` — cache invalidation on `StockIntake`, `Dispensation`, `Supplier`
- Dashboard views cached (60s global / branch)
- LocMem cache: `transcounty-cache`, 300s default, Redis when `REDIS_URL` set

## N+1 / performance

- Inventory list now served from React Query cache (no refetch on every tab visit)
- Dashboard endpoints server-cached with signal invalidation on writes

## Security

| Issue | Status |
|-------|--------|
| `DEBUG` defaults to `False` | ✅ Verified |
| `CORS_ALLOW_ALL_ORIGINS=True` | ✅ Not present (explicit whitelist) |
| Hardcoded `SECRET_KEY` outside settings | ⚠️ Default fallback in settings only — set `SECRET_KEY` in production `.env` |
| `.gitignore` sensitive files | ✅ No `.env`/`.sqlite3` tracked |

## Build verification

- `npm run build` — **pass** (initial JS gzip ~34 KB for `index` chunk; vendor ~53 KB)
- `console.log` in `src/` — **0**
- `print()` in production backend — **0**
