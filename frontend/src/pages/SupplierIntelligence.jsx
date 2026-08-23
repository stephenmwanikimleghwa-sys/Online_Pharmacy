import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LightBulbIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import {
  compareSupplierPrices,
  getProcurementAnalytics,
  getReorderSuggestions,
} from "../services/procurementService";
import { searchProducts } from "../services/productService";
import { useAuth } from "../context/AuthContext";
import { useSuppliers } from "../hooks/useSuppliers";
import { unwrapList } from "../utils/parseApiData";
import SupplierPriceComparison from "../components/SupplierPriceComparison";
import SupplierProfileModal from "../components/SupplierProfileModal";
import PageHeader from "../components/PageHeader";
import { PanelSkeleton } from "../components/ui/Skeleton";
import { queryClient } from "../lib/queryClient";
import { QUERY_KEYS } from "../lib/queryKeys";

const money = (n) =>
  `KES ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const buildReorderUrl = (s) => {
  const params = new URLSearchParams();
  if (s.recommended_supplier_id) params.set("supplier", String(s.recommended_supplier_id));
  if (s.product_id) params.set("product", String(s.product_id));
  if (s.suggested_quantity) params.set("qty", String(s.suggested_quantity));
  if (s.recommended_unit_price != null) params.set("price", String(s.recommended_unit_price));
  if (s.reason) params.set("reason", s.reason.slice(0, 280));
  params.set(
    "notes",
    `Smart reorder: ${s.product_name} (stock ${s.stock_quantity}, reorder at ${s.reorder_level})`,
  );
  return `/purchase-orders/new?${params.toString()}`;
};

/**
 * Dedicated Supplier Intelligence hub.
 * Uses Stock received history to compare prices and highlight savings.
 */
const SupplierIntelligence = () => {
  const navigate = useNavigate();
  const { user, activeBranch } = useAuth();
  const { data: suppliersRaw, isLoading: loadingSuppliers } = useSuppliers();
  const suppliers = unwrapList(suppliersRaw);

  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [reorderData, setReorderData] = useState(null);
  const [loadingReorder, setLoadingReorder] = useState(true);
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [compareData, setCompareData] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [insight, setInsight] = useState("");

  const loadReorderSuggestions = async () => {
    setLoadingReorder(true);
    try {
      const params = {};
      if (activeBranch?.id) params.branch = activeBranch.id;
      const res = await getReorderSuggestions(params);
      setReorderData(res.data || null);
    } catch {
      setReorderData(null);
    } finally {
      setLoadingReorder(false);
    }
  };

  const runAnalysis = async () => {
    setLoadingAnalytics(true);
    setAnalyticsError("");
    try {
      const res = await getProcurementAnalytics();
      const data = res.data || {};
      setAnalytics(data);

      const savings = Number(data.total_annual_savings || 0);
      const top = (data.potential_savings || [])[0];
      const topSpend = (data.spending_by_supplier || [])[0];
      const deps = data.dependency_alerts || [];

      const parts = [];
      if (topSpend) {
        parts.push(
          `You spent the most with ${topSpend.supplier_name} (${money(topSpend.total_spent)}).`,
        );
      }
      if (savings > 0 && top) {
        parts.push(
          `Biggest saving chance: buy ${top.product_name} from ${top.cheapest_supplier} instead of ${top.current_supplier} — about ${money(top.annual_saving)} per year.`,
        );
        parts.push(
          `Across all products, switching to cheaper suppliers could save about ${money(savings)} per year.`,
        );
      } else {
        parts.push(
          "No clear price gaps found yet. Record more Stock received deliveries with unit costs from different suppliers to unlock savings tips.",
        );
      }
      if (deps.length) {
        parts.push(
          `Watch: ${deps.map((d) => d.supplier_name).join(", ")} supply a large share of your products — consider a backup supplier.`,
        );
      }
      setInsight(parts.join(" "));
    } catch (err) {
      const status = err?.response?.status;
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.error?.message ||
        err?.message;
      if (status === 403) {
        setAnalyticsError("You do not have permission to view supplier price analysis.");
      } else if (status === 404) {
        setAnalyticsError("Supplier analysis is not available on the server yet. Try again after the next update.");
      } else if (!err?.response) {
        setAnalyticsError("Could not reach the server. Check your connection and try again.");
      } else {
        setAnalyticsError(
          typeof detail === "string" && detail
            ? detail
            : "Could not analyse supplier prices. Please try again.",
        );
      }
      setInsight("");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    runAnalysis();
    loadReorderSuggestions();
  }, [activeBranch?.id]);

  useEffect(() => {
    if (productQuery.trim().length < 2) {
      setProductOptions([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const list = await searchProducts(productQuery.trim());
        if (!cancelled) setProductOptions(Array.isArray(list) ? list.slice(0, 20) : []);
      } catch {
        if (!cancelled) setProductOptions([]);
      } finally {
        if (!cancelled) setSearchingProducts(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [productQuery]);

  const handleCompare = async (productId) => {
    if (!productId) return;
    setSelectedProductId(String(productId));
    setComparing(true);
    setCompareError("");
    setCompareData(null);
    try {
      const res = await compareSupplierPrices(productId);
      const data = res.data;
      setCompareData(data);
      const rows = data?.comparison || [];
      if (!rows.length) {
        setInsight(
          "No purchase history for this product yet. Record it under Stock received with a supplier and unit cost, then compare again."
        );
      } else if (rows.length === 1) {
        setInsight(
          `Only ${rows[0].supplier_name} has sold you this item so far (last price ${money(rows[0].last_price)}). Buy from another supplier once to unlock a price comparison.`
        );
      } else {
        const best = rows[0];
        const worst = rows[rows.length - 1];
        const diff = Number(data?.price_range?.difference || 0);
        setInsight(
          `Result: ${best.supplier_name} is cheapest at ${money(best.last_price)}. ` +
            `${worst.supplier_name} is highest at ${money(worst.last_price)}. ` +
            (diff > 0
              ? `Difference: ${money(diff)} per unit — prefer ${best.supplier_name} when you reorder.`
              : "Prices are similar across suppliers.")
        );
      }
    } catch {
      setCompareError("Could not compare suppliers for this product.");
    } finally {
      setComparing(false);
    }
  };

  const topSavings = useMemo(
    () => (analytics?.potential_savings || []).slice(0, 8),
    [analytics]
  );
  const topSpend = useMemo(
    () => (analytics?.spending_by_supplier || []).slice(0, 6),
    [analytics]
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      <PageHeader
        title="Supplier intelligence"
        description="Who to buy from when stock runs low, who is cheapest, and how much you could save. Built from Stock received history."
        actions={
          <div className="flex flex-wrap gap-2">
            {user?.role === "admin" ? (
              <Link
                to="/restocks"
                className="px-4 py-2.5 rounded-xl text-sm font-bold border"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
              >
                All restocks
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                runAnalysis();
                loadReorderSuggestions();
              }}
              disabled={loadingAnalytics || loadingReorder}
              className="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            >
              {loadingAnalytics || loadingReorder ? "Analysing…" : "Run analysis"}
            </button>
          </div>
        }
      />

      {insight ? (
        <div
          className="rounded-2xl border p-4 sm:p-5"
          style={{
            background: "var(--brand-mist)",
            borderColor: "var(--brand-border-soft)",
          }}
          role="status"
        >
          <div className="flex gap-3">
            <LightBulbIcon className="w-6 h-6 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-primary)" }}>
                What this means
              </p>
              <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {insight}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {analyticsError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
          {analyticsError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl border p-4" style={{ borderColor: "var(--border-primary)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Possible yearly savings</p>
          <p className="text-2xl font-display font-bold" style={{ color: "var(--color-primary)" }}>
            {loadingAnalytics ? "…" : money(analytics?.total_annual_savings)}
          </p>
        </div>
        <div className="glass-card rounded-xl border p-4" style={{ borderColor: "var(--border-primary)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Products with a cheaper option</p>
          <p className="text-2xl font-display font-bold" style={{ color: "var(--text-primary)" }}>
            {loadingAnalytics ? "…" : (analytics?.potential_savings || []).length}
          </p>
        </div>
        <div className="glass-card rounded-xl border p-4" style={{ borderColor: "var(--border-primary)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--text-secondary)" }}>Need restock now</p>
          <p className="text-2xl font-display font-bold" style={{ color: "var(--text-primary)" }}>
            {loadingReorder ? "…" : reorderData?.count ?? 0}
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border-primary)" }}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCartIcon className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
              <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                Restock suggestions
              </h2>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {reorderData?.summary ||
                "Low and out-of-stock items with a recommended supplier and why."}
            </p>
          </div>
        </div>

        {loadingReorder ? (
          <PanelSkeleton rows={4} />
        ) : !(reorderData?.suggestions || []).length ? (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Stock looks healthy for this branch — no low-stock items right now.
          </p>
        ) : (
          <ul className="space-y-3">
            {(reorderData.suggestions || []).slice(0, 15).map((s) => (
              <li
                key={`${s.product_id}-${s.branch_id}`}
                className="rounded-xl border p-4 flex flex-col lg:flex-row lg:items-center gap-3"
                style={{ borderColor: "var(--border-primary)", background: "var(--bg-field)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-bold truncate" style={{ color: "var(--text-primary)" }}>
                      {s.product_name}
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        s.urgency === "out"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {s.urgency === "out" ? "Out of stock" : "Low stock"}
                    </span>
                  </div>
                  <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                    On hand: <strong>{s.stock_quantity}</strong> · Reorder at{" "}
                    <strong>{s.reorder_level}</strong>
                    {s.recommended_supplier_name
                      ? ` · Suggested qty: ${s.suggested_quantity}`
                      : ""}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {s.reason || "No supplier recommendation yet."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 flex-shrink-0">
                  {s.recommended_supplier_id ? (
                    <button
                      type="button"
                      onClick={() => navigate(buildReorderUrl(s))}
                      className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold text-white"
                    >
                      Order from {s.recommended_supplier_name}
                    </button>
                  ) : (
                    <Link
                      to="/purchase-orders/new"
                      className="px-4 py-2.5 rounded-xl text-xs font-bold border"
                      style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    >
                      Create order
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCompare(s.product_id)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold border"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                  >
                    Compare prices
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="glass-card rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--border-primary)" }}>
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
          <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
            Compare price for one product
          </h2>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Search a medicine, then see which supplier was cheapest the last times you bought it.
        </p>
        <div className="relative">
          <input
            type="search"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Type product name…"
            className="form-input w-full"
          />
          {(searchingProducts || productOptions.length > 0) && productQuery.trim().length >= 2 ? (
            <div
              className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl border shadow-lg"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}
            >
              {searchingProducts ? (
                <p className="p-3 text-sm" style={{ color: "var(--text-secondary)" }}>Searching…</p>
              ) : productOptions.length === 0 ? (
                <p className="p-3 text-sm" style={{ color: "var(--text-secondary)" }}>No products found.</p>
              ) : (
                productOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-sm font-semibold hover:opacity-80 border-b last:border-0"
                    style={{ color: "var(--text-primary)", borderColor: "var(--border-primary)" }}
                    onClick={() => {
                      setProductQuery(p.name);
                      setProductOptions([]);
                      handleCompare(p.id);
                    }}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
        {comparing ? <PanelSkeleton rows={4} /> : null}
        {compareError ? <p className="text-sm text-rose-600">{compareError}</p> : null}
        {compareData && !comparing ? <SupplierPriceComparison data={compareData} /> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl border p-5" style={{ borderColor: "var(--border-primary)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-5 h-5" style={{ color: "var(--color-primary)" }} />
            <h2 className="font-display font-bold" style={{ color: "var(--text-primary)" }}>
              Where you spend most
            </h2>
          </div>
          {loadingAnalytics ? (
            <PanelSkeleton rows={4} />
          ) : topSpend.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No spend data yet. Add deliveries in{" "}
              <Link to="/inventory/management?tab=intake" className="underline font-semibold text-primary">
                Stock received
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {topSpend.map((row) => (
                <li
                  key={row.supplier_id}
                  className="flex justify-between gap-3 text-sm py-2 border-b last:border-0"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {row.supplier_name}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {money(row.total_spent)} · {row.pct_of_total}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card rounded-xl border p-5" style={{ borderColor: "var(--border-primary)" }}>
          <h2 className="font-display font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            Best saving ideas
          </h2>
          {loadingAnalytics ? (
            <PanelSkeleton rows={4} />
          ) : topSavings.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No savings tips yet. You need the same product bought from at least two suppliers.
            </p>
          ) : (
            <ul className="space-y-3">
              {topSavings.map((row) => (
                <li key={row.product_id} className="text-sm">
                  <button
                    type="button"
                    className="text-left w-full"
                    onClick={() => handleCompare(row.product_id)}
                  >
                    <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                      {row.product_name}
                    </p>
                    <p style={{ color: "var(--text-secondary)" }}>
                      Switch from {row.current_supplier} ({money(row.current_price)}) to{" "}
                      {row.cheapest_supplier} ({money(row.cheapest_price)}) — save about{" "}
                      <strong style={{ color: "var(--color-primary)" }}>{money(row.annual_saving)}/year</strong>
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="glass-card rounded-xl border p-5" style={{ borderColor: "var(--border-primary)" }}>
        <h2 className="font-display font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Open a supplier
        </h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Tap a name for price history, scorecard, and payments. Money owed only shows when a delivery was marked on credit — paid deliveries stay at KES 0.
        </p>
        {loadingSuppliers ? (
          <PanelSkeleton rows={3} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {suppliers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSupplier(s)}
                className="px-3 py-2 rounded-xl text-xs font-bold border"
                style={{
                  background: selectedProductId ? "var(--bg-field)" : "var(--bg-card)",
                  borderColor: "var(--border-primary)",
                  color: "var(--text-primary)",
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs" style={{ color: "var(--text-secondary)" }}>
          Manage supplier contacts and balances in{" "}
          <Link to="/inventory/management?tab=suppliers" className="underline font-semibold text-primary">
            Inventory → Suppliers
          </Link>
          .
        </p>
      </div>

      {selectedSupplier ? (
        <SupplierProfileModal
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
          onRefresh={() => void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers })}
        />
      ) : null}
    </div>
  );
};

export default SupplierIntelligence;
