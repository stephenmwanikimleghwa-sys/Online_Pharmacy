# Technical Debt — Post React Query Migration

Issues identified but not fully resolved in this session. Prioritized by risk.

---

## 1. Partial component migration

**Description:** Several pages still use `useEffect` + manual `api.get` instead of shared hooks: `AdminStock.jsx`, `OTCSalePanel.jsx`, `PurchaseOrders.jsx`, `StockIntakeLog.jsx`, `BranchTransfers.jsx`, `RestockRequests.jsx`, `DispensingLogs.jsx`, finance/clinical report dashboards.

**Risk:** Medium — inconsistent cache invalidation and duplicate fetch logic.

**Effort:** 2–3 days

**Recommendation:** Migrate remaining pages to hooks in `src/hooks/`; use `QUERY_KEYS` and `STALE_TIMES` everywhere.

---

## 2. Inventory `per_page: 5000`

**Description:** Inventory list still loads up to 5000 products per request (by design per prior approval). React Query caches the payload but first load remains heavy.

**Risk:** Medium — slow first paint on large catalogs.

**Effort:** 3–5 days

**Recommendation:** Server-side pagination + virtualized table; keep prefetch for dashboard summaries only.

---

## 3. Backend endpoint caching incomplete

**Description:** Only dashboard global/branch views use `cached_view()`. Branches, products, suppliers, low-stock, expiry endpoints not yet wrapped.

**Risk:** Low–medium under load.

**Effort:** 1 day

**Recommendation:** Add `cached_view` to hot read endpoints with keys matching `signals.py` invalidation.

---

## 4. `SECRET_KEY` default in settings

**Description:** `SECRET_KEY` falls back to a placeholder if env var missing.

**Risk:** High if deployed without env.

**Effort:** 15 minutes

**Recommendation:** Fail fast in production when `SECRET_KEY` is unset.

---

## 5. PO receive route

**Description:** `/purchase-orders/:id/receive` may 404 — receive UI not fully built.

**Risk:** Low (feature gap).

**Effort:** 1–2 days

**Recommendation:** Implement receive page or remove nav link.

---

## 6. SQLite test suite

**Description:** Migrations use Postgres-specific SQL (`current_schema()`); local SQLite tests fail.

**Risk:** Low for production (Postgres on Render).

**Effort:** 1 day

**Recommendation:** Split DB-specific migrations or use Postgres in CI.

---

## 7. Bundle size — excel/charts chunks

**Description:** `excel` (~282 KB) and `charts` (~328 KB) chunks exceed 300 KB warning.

**Risk:** Low — lazy-loaded.

**Effort:** 0.5 day

**Recommendation:** Dynamic import only on export/report pages (already mostly lazy).

---

## 8. `useSupplierDetail` prefetch

**Description:** Supplier transactions prefetch uses `products-supplied` endpoint; `supplierTransactions` query key may not match a dedicated transactions API.

**Risk:** Low.

**Effort:** 2 hours

**Recommendation:** Align query keys with actual supplier transaction endpoint when added.

---

## 9. Code consistency backlog

**Description:** Not completed: universal `api_response` helper adoption, `BranchScopedMixin` consolidation, `ApiErrorCode` enum migration, model `__str__` audit, N+1 `select_related` on all listed views, page titles on every page, empty states on all lists, form loading states everywhere.

**Risk:** Low–medium (maintainability).

**Effort:** 1–2 weeks

**Recommendation:** Tackle incrementally by module (inventory → auth → finance).
