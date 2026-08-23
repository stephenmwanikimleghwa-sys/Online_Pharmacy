/**
 * Copy index.html into each SPA route folder so Render Static Sites
 * can hard-refresh deep links without a CDN rewrite rule.
 *
 * Render's static host returns plain "Not Found" when the path has no file.
 * Physical /path/index.html files are served correctly.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const indexHtml = path.join(DIST, "index.html");

/** Static paths from App.jsx (no :params). Keep in sync when adding routes. */
const SPA_ROUTES = [
  "/login",
  "/password-reset",
  "/force-password-change",
  "/branch/select",
  "/products",
  "/financials",
  "/quotations",
  "/clinical",
  "/stock-adjustments",
  "/returns",
  "/reconciliation",
  "/compliance",
  "/documents",
  "/licensing",
  "/users",
  "/inventory",
  "/inventory/control",
  "/inventory/management",
  "/customer/dashboard",
  "/account",
  "/pharmacist/dashboard",
  "/branch/dashboard",
  "/prescriptions/add",
  "/stock-intake",
  "/purchase-orders",
  "/purchase-orders/new",
  "/admin/dashboard",
  "/admin/branches",
  "/admin/users",
  "/admin/restock-requests",
  "/reports",
  "/dispensing-logs",
  "/otc-sales",
  "/customers",
  "/cashier/dashboard",
];

if (!fs.existsSync(indexHtml)) {
  console.error(`[spa-fallbacks] Missing ${indexHtml}`);
  process.exit(1);
}

let written = 0;
for (const route of SPA_ROUTES) {
  const destDir = path.join(DIST, route.replace(/^\//, ""));
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, "index.html");
  fs.copyFileSync(indexHtml, dest);
  written += 1;
}

console.log(`[spa-fallbacks] Wrote ${written} route shells under ${DIST}`);
