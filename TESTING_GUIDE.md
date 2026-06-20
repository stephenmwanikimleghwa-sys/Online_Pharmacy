# TRANSCOUNTY PHARMACY — TESTING GUIDE

This guide covers Supplier Intelligence, Cross-Branch Availability, Expiry/FEFO, Purchase Orders, and regression checks after deployment.

**Apply migrations first:**
```bash
cd backend && source test-venv/bin/activate
python manage.py migrate users 0023_supplier_intelligence_and_batch_fefo
python manage.py migrate inventory 0020_supplier_intelligence_and_batch_fefo
```

---

## TEST GROUP A — SUPPLIER INTELLIGENCE

### A1 — View Supplier Products Tab

**What it does:** Shows all products ever supplied by a vendor with price history summary.

**Prerequisites:** At least 2 `StockIntake` records for the same supplier (different products or dates).

**Steps:**
1. Log in as admin.
2. Sidebar → Inventory Management → Suppliers (or `/inventory/management` → Suppliers tab).
3. Click **PHILMED LTD** (or any supplier with intake history).
4. Click **Products** tab.
5. Verify columns: Product Name, Last Price, Last Date, Times Bought, Avg Price, Trend.
6. Click any product row.
7. Verify price history list opens (dates + prices, newest first).

**Expected results:**
- Step 5: All products from past intakes appear.
- Step 7: History matches `StockIntake` records for that supplier+product.

**Edge cases:** Single intake → trend shows → Stable. Zero intakes → empty state message.

**Common failure points:** Empty table → check `StockIntake.supplier_id` is set on intakes.

---

### A2 — View Price Comparison for a Product

**What it does:** Ranks suppliers by last purchase price for one product.

**Prerequisites:** Same product bought from 2+ suppliers via stock intake.

**Steps:**
1. Open supplier profile → **Compare** tab.
2. Select a product from dropdown.
3. Review comparison table (sorted cheapest first).

**Expected:** API `GET /api/inventory/suppliers/compare/?product_id=X` returns medals, `is_cheapest`, savings.

**Edge cases:** Only one supplier → single row, no savings message.

---

### A3 — Price History Chart (Multiple Supplier Lines)

**What it does:** Line chart of price over time per supplier.

**Steps:** Same as A2; scroll to chart below table.

**Expected:** One colored line per supplier; tooltip shows date + KES price.

---

### A4 — Create Purchase Order from Low Stock Alert

**Prerequisites:** Product below reorder level with intake history.

**Steps:**
1. Admin dashboard or Inventory → note low stock item with `reorder_intelligence` in API.
2. Navigate to **Purchase Orders** → **New Purchase Order**.
3. Pre-fill supplier/product/qty from low-stock suggestion (or manually match best supplier).
4. Submit.

**Expected:** PO created with status DRAFT, order number `PO-YYYY-NNNN`.

---

### A5 — Mark Purchase Order as Sent

**Steps:** Purchase Orders list → **Mark Sent** on a DRAFT PO.

**Expected:** Status → SENT (blue badge).

---

### A6 — Receive Stock Against Purchase Order

**Steps:**
1. On SENT PO → **Receive Stock** (or `GET /api/purchase-orders/{id}/receive/` then POST with expiry dates).
2. Confirm quantities and expiry dates in intake flow.
3. Submit.

**Expected:** PO → RECEIVED; `StockIntake` records created; branch stock increased.

---

### A7 — View Supplier Scorecard

**Steps:** Supplier profile → **Scorecard** tab.

**Expected:** Overall score /100, component scores, cheapest vs not-cheapest counts, potential monthly savings.

---

### A8 — Procurement Analytics — Spending Chart

**Steps:** Reports → **Procurement Analytics** tab.

**Expected:** Bar chart of spend by supplier; dependency warnings if >40% products from one supplier.

---

### A9 — Potential Savings Report

**Steps:** Same tab → scroll to savings table.

**Expected:** Products where current supplier is not cheapest; annual savings total at top.

---

### A10 — Price Comparison at Intake

**Steps:**
1. Open **New Stock Intake** (bulk modal).
2. Select supplier + product.
3. Enter cost price higher than last purchase.

**Expected:** Amber “Price increased” warning; green if lower; shows last price and best-ever price.

---

## TEST GROUP B — CROSS-BRANCH AVAILABILITY

### B1 — Out-of-stock at ANNEX, stock at MAIN

**Steps:**
1. Log in as admin; switch branch to **TRANSCOUNTY_ANNEX**.
2. OTC Sale → search product that has 0 stock at ANNEX but stock at MAIN.
3. Product appears greyed with red badge.
4. Click availability note → panel shows other branches.

**Expected:** `GET /api/products/{id}/availability/` returns `available_elsewhere: true`.

---

### B2 — Pharmacist sees no quantities elsewhere

**Steps:** Log in as standard pharmacist (no `can_transfer_stock`).

**Expected:** Message only: “available at other branches — contact administrator”; no unit counts.

---

### B3 — Admin sees exact quantities

**Steps:** Admin or user with `can_transfer_stock=True`.

**Expected:** `other_branches` array with branch names and quantities.

---

### B4 — Submit Transfer Request from OTC

**Steps:** From availability panel → **Request Transfer** → choose source branch, qty → Submit.

**Expected:** Success toast; `TRANSFER_REQUESTED` in activity logs.

---

### B5 — Transfer on Admin Dashboard

**Steps:** Admin dashboard → Pending Transfer Requests widget.

**Expected:** Product, route, requester, time shown.

---

### B6 — Admin Approves Transfer

**Steps:** Click **Approve**.

**Expected:** Source stock decreases, destination increases; `TRANSFER_APPROVED` logged.

---

### B7 — Admin Rejects with Reason

**Steps:** **Reject** → enter reason.

**Expected:** Status rejected; reason stored; staff notified.

---

### B8 — Zero Stock Everywhere

**Steps:** Search product with 0 at all branches.

**Expected:** “Not available at any branch”; no transfer button.

---

## TEST GROUP C — EXPIRY & FEFO

### C1 — Two Batches Different Expiry

**Steps:** Stock intake same product twice with different expiry dates.

**Expected:** Two `Batch` rows with correct `quantity_remaining`.

---

### C2 — FEFO Single Batch Sale

**Steps:** OTC sale quantity ≤ earliest batch only.

**Expected:** Earliest-expiry batch decremented first.

---

### C3 — Sale Spanning Two Batches

**Steps:** Sale qty > first batch, < total batch stock.

**Expected:** First batch → 0; second batch partially used.

---

### C4 — CRITICAL Expiry Warning (≤7 days)

**Steps:** Add product whose earliest batch expires in ≤7 days to cart.

**Expected:** Blocking modal; **Add Anyway** or **Remove from Sale**.

---

### C5 — WARNING Toast (8–30 days)

**Expected:** Amber notification; sale continues.

---

### C6 — CAUTION Badge (31–90 days)

**Expected:** Small expiry badge only; no block.

---

### C7 — Dashboard Expiry Widget

**Steps:** Admin or pharmacist dashboard → Expiry Alerts section.

**Expected:** EXPIRED / CRITICAL / WARNING groups populated from batches.

---

### C8 — Mark Expired as Removed

**Steps:** Expiry widget → **Mark as Removed** on expired batch.

**Expected:** Batch qty 0; `StockLog` type expired; branch stock reduced.

---

### C9 — Clearance Pricing

**Steps:** **Discount & Sell** → set clearance price.

**Expected:** Batch `is_clearance=true`; CLEARANCE pricing on sale (if wired to product card).

---

### C10 — Block Past Expiry on Intake

**Steps:** Enter expiry date in the past on intake form.

**Expected:** Blocked with error message.

---

### C11 — Warning for 20-Day Expiry on Intake

**Steps:** Expiry ~20 days out → confirm modal → **Yes, Receive Stock**.

**Expected:** Intake succeeds after confirmation.

---

### C12 — Expiry Report

**Steps:** Reports → Expiry Report; filter 90 days.

**Expected:** Batch-level rows with status EXPIRED/CRITICAL/WARNING.

---

### C13 — Expiry Report Excel Export

**Steps:** Export as Excel on expiry report.

**Expected:** `.xlsx` downloads with batch columns.

---

## TEST GROUP D — PURCHASE ORDERS

### D1 — PO from Low Stock Alert

See A4.

### D2 — Manual PO Create

**Steps:** `/purchase-orders/new` → fill form → Create.

### D3 — Multiple Products on One PO

**Note:** Current UI creates single-line POs; use API for multi-line:
`POST /api/purchase-orders/` with `items: [...]`.

### D4 — Change Status to SENT

See A5.

### D5 — Receive Against PO

See A6.

### D6 — Cancel with Reason

**Steps:** Cancel → enter reason.

**Expected:** Status CANCELLED; reason saved.

### D7 — Status Badges

**Expected:** DRAFT grey, SENT blue, RECEIVED green, CANCELLED red.

---

## TEST GROUP E — REGRESSION

### E1 — Normal OTC Sale

In-stock product → complete sale → receipt.

### E2 — Credit Sale

Credit customer → balance updates.

### E3 — Stock Intake Without PO

Bulk intake still works; creates batch + branch stock.

### E4 — Admin Dashboard Loads

No console errors; widgets render.

### E5 — Pharmacist Dashboard Loads

Expiry widget + prescriptions + inventory summary.

### E6 — Login + Branch Selection

Admin selects branch; active branch persists.

### E7 — Reports Generate

Sales, valuation, expiry, procurement tabs load.

### E8 — Activity Logs

Transfer/sale/intake events appear in dispensing/activity logs.

---

## QUICK SMOKE TEST (5 minutes)

1. Home page loads in <3 seconds.
2. Login as admin → dashboard.
3. Switch branch → active branch updates.
4. OTC Sale search → results appear.
5. Complete one in-stock sale → receipt.
6. Dispensing logs → sale listed.
7. Open one supplier → profile loads.
8. Expiry alerts widget loads.
9. Logout → login page.

If all 9 pass: deployment is healthy. If any fail: check server logs and migration status first.
