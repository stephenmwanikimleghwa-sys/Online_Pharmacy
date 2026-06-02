import React, { useState, useCallback, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { searchProducts } from "../services/productService";
import { getProductDisplayPrice, getProductBranchQuantity } from "../utils/parseApiData";
import LoadingButton from "./LoadingButton";

/**
 * Shared OTC quick-sale UI (same flow as pharmacist QuickSale modal).
 */
const OTCSalePanel = ({ notesPrefix = "OTC sale" }) => {
  const { notify } = useNotification();
  const { activeBranch, user } = useAuth();
  const branchId = activeBranch?.id ?? user?.branch ?? null;

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [lastOrder, setLastOrder] = useState(null);
  const [outOfStockHint, setOutOfStockHint] = useState(null);

  const runSearch = useCallback(
    async (term) => {
      const q = term.trim();
      if (q.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const products = await searchProducts(q, { branchId, perPage: 80 });
        setSearchResults(products);
        setOutOfStockHint(null);
        if (products.length === 0) {
          // RULE 3: explain out-of-stock + show other-branch availability when possible
          const broad = await api.get("/products/", {
            params: { context: "inventory", search: q, page_size: 5 },
            skipGlobalErrorNotification: true,
          });
          const matches = broad.data?.results || broad.data?.data || [];
          if (matches.length > 0) {
            const product = matches[0];
            const availability = await api.get(`/products/${product.id}/availability/`, {
              skipGlobalErrorNotification: true,
            });
            const branches = availability.data?.branches || [];
            const alternatives = branches.filter((b) => Number(b.quantity) > 0 && !b.is_active_branch);
            setOutOfStockHint({
              productName: product.name,
              alternatives,
            });
          }
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [branchId],
  );

  useEffect(() => {
    const t = setTimeout(() => runSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm, runSearch]);

  const addToSale = (product) => {
    const qtyAvail = getProductBranchQuantity(product, branchId);
    if (qtyAvail <= 0) {
      notify.warning("Out of Stock", `${product.name} is not available at your branch.`);
      return;
    }
    const existing = selectedItems.find((item) => item.id === product.id);
    if (existing) {
      if (existing.quantity >= qtyAvail) {
        notify.warning("Insufficient Stock", `Only ${qtyAvail} units available.`);
        return;
      }
      setSelectedItems(
        selectedItems.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
    } else {
      const unitPrice = getProductDisplayPrice(product);
      setSelectedItems([
        ...selectedItems,
        { ...product, quantity: 1, unitPrice },
      ]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setSelectedItems(
      selectedItems.map((item) => {
        if (item.id !== productId) return item;
        const max = getProductBranchQuantity(item, branchId);
        const next = Math.max(1, Math.min(max, item.quantity + delta));
        return { ...item, quantity: next };
      }),
    );
  };

  const removeItem = (productId) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== productId));
  };

  const calculateTotal = () =>
    selectedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const handleCompleteSale = async () => {
    setSaleError("");
    if (!selectedItems.length) {
      notify.warning("Empty Cart", "Add at least one product before completing the sale.");
      return;
    }
    setCompleting(true);
    try {
      const response = await api.post(
        "/orders/quick/",
        {
          items: selectedItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        },
        { skipGlobalErrorNotification: true },
      );
      const order = response.data?.data ?? response.data;
      setLastOrder(order);
      setSelectedItems([]);
      setSearchTerm("");
      setSearchResults([]);
      notify.success(
        "Sale Complete",
        `Sale recorded. Total: KES ${Number(order?.total_amount ?? calculateTotal()).toLocaleString()}.`,
      );
    } catch (error) {
      const data = error.response?.data;
      const msg =
        data?.error?.message ||
        data?.detail ||
        data?.error ||
        data?.message ||
        "Failed to complete sale. Please try again.";
      setSaleError(typeof msg === "string" ? msg : "Failed to complete sale.");
    } finally {
      setCompleting(false);
    }
  };

  const handleDownloadReceipt = async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}/receipt/`, {
        responseType: "blob",
        skipGlobalErrorNotification: true,
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch {
      notify.error("Receipt Failed", "Could not generate the receipt.");
    }
  };

  const resetSale = () => {
    setLastOrder(null);
    setSaleError("");
  };

  const fmt = (n) => `KES ${Number(n).toLocaleString()}`;
  const stockBadge = (qty) => {
    if (qty <= 0) return null;
    if (qty <= 5) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
          Only {qty} left
        </span>
      );
    }
    if (qty <= 20) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
          {qty} in stock
        </span>
      );
    }
    return null;
  };

  if (lastOrder) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <CheckCircleIcon className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Sale completed</h3>
        <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
          Order #{lastOrder.id} — {fmt(lastOrder.total_amount)}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button type="button" className="btn-primary px-6 py-2 rounded-xl" onClick={resetSale}>
            New sale
          </button>
          <button
            type="button"
            className="px-6 py-2 rounded-xl border flex items-center gap-2"
            style={{ borderColor: "var(--border-primary)" }}
            onClick={() => handleDownloadReceipt(lastOrder.id)}
          >
            <ArrowDownTrayIcon className="h-5 w-5" /> Receipt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card rounded-2xl p-6 border" style={{ borderColor: "var(--border-primary)" }}>
        <label className="form-label">Search product</label>
        <div className="relative mb-4">
          {!searchTerm && (
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          )}
          <input
            type="search"
            className={`form-input ${searchTerm ? "pl-3" : "pl-10"}`}
            placeholder="Type at least 2 characters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {activeBranch?.name && (
          <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
            Branch: <strong>{activeBranch.name}</strong>
          </p>
        )}
        <div className="max-h-80 overflow-y-auto space-y-2">
          {searching && (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>
              Searching...
            </p>
          )}
          {!searching && searchTerm.length >= 2 && searchResults.length === 0 && (
            <div className="text-sm text-center py-4 space-y-2" style={{ color: "var(--text-secondary)" }}>
              <p>No products found at this branch.</p>
              {outOfStockHint && (
                <div className="text-left bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-2">
                  <p>
                    <strong>{outOfStockHint.productName}</strong> is out of stock at{" "}
                    <strong>{activeBranch?.name || "your branch"}</strong>.
                  </p>
                  {outOfStockHint.alternatives?.length > 0 && (
                    <div>
                      <p className="font-semibold mb-1">Available at:</p>
                      {outOfStockHint.alternatives.map((alt) => (
                        <div key={alt.branch} className="flex items-center justify-between">
                          <span>{alt.branch} ({alt.quantity} units)</span>
                          <button
                            type="button"
                            className="text-[11px] underline font-semibold"
                            onClick={() => notify.info("Transfer Request", "Open Branch Transfers to request stock transfer.")}
                          >
                            Request Transfer
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {searchResults.map((product) => {
            const qty = getProductBranchQuantity(product, branchId);
            const price = getProductDisplayPrice(product);
            return (
              <button
                key={product.id}
                type="button"
                disabled={qty <= 0}
                onClick={() => addToSale(product)}
                className="w-full text-left p-3 rounded-xl border transition-colors disabled:opacity-50"
                style={{ borderColor: "var(--border-primary)" }}
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-sm">{product.name}</span>
                  <span className="text-sm font-bold text-primary">{fmt(price)}</span>
                </div>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Stock: {qty}
                </span>
                <div className="mt-1">{stockBadge(qty)}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 border flex flex-col" style={{ borderColor: "var(--border-primary)" }}>
        <h3 className="font-bold mb-4">Current sale</h3>
        {saleError && (
          <div className="alert-error mb-4 text-sm rounded-xl p-3">{saleError}</div>
        )}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-[200px]">
          {selectedItems.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-secondary)" }}>
              No items yet
            </p>
          ) : (
            selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-3 rounded-xl data-cell"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  <p className="text-xs">{fmt(item.unitPrice)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQuantity(item.id, -1)} className="p-1 rounded-lg border">
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <span className="font-bold w-6 text-center">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.id, 1)} className="p-1 rounded-lg border">
                    <PlusIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="text-xs text-red-600 ml-1"
                    onClick={() => removeItem(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t pt-4" style={{ borderColor: "var(--border-primary)" }}>
          <div className="flex justify-between mb-4">
            <span className="font-bold">Total</span>
            <span className="text-xl font-bold text-primary">{fmt(calculateTotal())}</span>
          </div>
          <LoadingButton
            className="w-full btn-primary py-3 rounded-xl font-bold"
            loading={completing}
            loadingText="Processing..."
            disabled={selectedItems.length === 0}
            onClick={handleCompleteSale}
          >
            Complete sale
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};

export default OTCSalePanel;
