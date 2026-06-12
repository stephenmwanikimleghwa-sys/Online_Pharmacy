import React, { useState, useCallback, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  CheckCircleIcon,
  PrinterIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { fetchBranchCatalog, searchProducts } from "../services/productService";
import { getProductDisplayPrice, getProductBranchQuantity } from "../utils/parseApiData";
import LoadingButton from "./LoadingButton";
import ReceiptModal from "./ReceiptModal";

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
  const [showReceipt, setShowReceipt] = useState(false);
  const [outOfStockHint, setOutOfStockHint] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Setup Phase State
  const [setup, setSetup] = useState({
    complete: false,
    customerType: "walk-in",
    patientName: "",
    creditCustomerId: "",
    pricingTier: "retail",
  });
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const sortForOTC = useCallback(
    (products) => {
      const branchName = activeBranch?.name || null;
      return [...products].sort((a, b) => {
        const aq = getProductBranchQuantity(a, branchId, branchName);
        const bq = getProductBranchQuantity(b, branchId, branchName);
        const aActiveStock = aq > 0 ? 1 : 0;
        const bActiveStock = bq > 0 ? 1 : 0;
        if (aActiveStock !== bActiveStock) return bActiveStock - aActiveStock;
        return (a?.name || "").localeCompare(b?.name || "");
      });
    },
    [activeBranch?.name, branchId],
  );

  const showAvailabilityHint = useCallback(
    async (product) => {
      try {
        const availability = await api.get(`/products/${product.id}/availability/`, {
          skipGlobalErrorNotification: true,
        });
        const branches = availability.data?.branches || [];
        const alternatives = branches.filter((b) => Number(b.quantity) > 0 && !b.is_active_branch);
        setOutOfStockHint({
          productName: product.name,
          activeBranchName:
            branches.find((b) => b.is_active_branch)?.branch || activeBranch?.name || "your branch",
          alternatives,
        });
      } catch {
        setOutOfStockHint({
          productName: product.name,
          activeBranchName: activeBranch?.name || "your branch",
          alternatives: [],
        });
      }
    },
    [activeBranch?.name],
  );

  const runSearch = useCallback(
    async (term) => {
      const q = term.trim();
      if (q.length < 2) {
        setSearchResults(catalog);
        setOutOfStockHint(null);
        return;
      }
      setSearching(true);
      try {
        const products = await searchProducts(q, { branchId, perPage: 80 });
        setSearchResults(sortForOTC(products));
        setOutOfStockHint(null);
        if (products.length === 0) {
          // RULE 3: explain out-of-stock + show other-branch availability when possible
          const broad = await api.get("/products/", {
            params: { context: "inventory", search: q, page_size: 5 },
            skipGlobalErrorNotification: true,
          });
          const matches = broad.data?.results || broad.data?.data || [];
          if (matches.length > 0) {
            setSearchResults(sortForOTC(matches));
          }
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [branchId, catalog, sortForOTC],
  );

  const loadCatalog = useCallback(async () => {
    try {
      const products = await fetchBranchCatalog({ branchId, perPage: 500 });
      const sorted = sortForOTC(products);
      setCatalog(sorted);
      if (!searchTerm.trim()) {
        setSearchResults(sorted);
      }
    } catch {
      setCatalog([]);
      setSearchResults([]);
    }
  }, [branchId, searchTerm, sortForOTC]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const loadCustomers = useCallback(async () => {
    try {
      setLoadingCustomers(true);
      const res = await api.get('/auth/customers/');
      const data = res.data?.results || res.data?.data || res.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    if (setup.customerType === 'credit' && customers.length === 0) {
      void loadCustomers();
    }
  }, [setup.customerType, customers.length, loadCustomers]);

  useEffect(() => {
    const t = setTimeout(() => runSearch(searchTerm), 350);
    return () => clearTimeout(t);
  }, [searchTerm, runSearch]);

  const addToSale = (product) => {
    const qtyAvail = getProductBranchQuantity(product, branchId, activeBranch?.name);
    if (qtyAvail <= 0) {
      notify.warning(
        "Out of Stock",
        `${product.name} is out of stock at ${activeBranch?.name || "your branch"}.`,
      );
      void showAvailabilityHint(product);
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
      let unitPrice = getProductDisplayPrice(product);
      if (setup.pricingTier === 'wholesale' && product.pricing_tier?.wholesale_price) {
        unitPrice = Number(product.pricing_tier.wholesale_price);
      }
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
        const max = getProductBranchQuantity(item, branchId, activeBranch?.name);
        const current = parseInt(item.quantity) || 0;
        const next = Math.max(1, Math.min(max, current + delta));
        return { ...item, quantity: next };
      }),
    );
  };

  const handleQuantityChange = (productId, valStr) => {
    const val = parseInt(valStr, 10);
    if (isNaN(val)) {
      setSelectedItems(selectedItems.map(item => item.id === productId ? { ...item, quantity: '' } : item));
      return;
    }
    setSelectedItems(
      selectedItems.map((item) => {
        if (item.id !== productId) return item;
        const max = getProductBranchQuantity(item, branchId, activeBranch?.name);
        return { ...item, quantity: Math.max(1, Math.min(max, val)) };
      })
    );
  };

  const handleQuantityBlur = (productId) => {
    setSelectedItems(
      selectedItems.map((item) => {
        if (item.id !== productId) return item;
        if (!item.quantity || parseInt(item.quantity) < 1) {
          return { ...item, quantity: 1 };
        }
        return item;
      })
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

    const cleanedItems = selectedItems.map(i => ({...i, quantity: parseInt(i.quantity) || 1}));
    const total = cleanedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    if (total > 10000) {
      const confirmMsg = cleanedItems.length === 1 
        ? `Large order: ${cleanedItems[0].quantity} × KES ${cleanedItems[0].unitPrice.toLocaleString()} = KES ${total.toLocaleString()}. Confirm?`
        : `Large order: ${cleanedItems.reduce((sum, item) => sum + item.quantity, 0)} items = KES ${total.toLocaleString()}. Confirm?`;
      if (!window.confirm(confirmMsg)) return;
    }

    setCompleting(true);
    try {
      const getMappedPaymentMode = () => {
        if (setup.customerType === 'credit') return 'CREDIT';
        switch(paymentMethod) {
          case 'cash': return 'CASH';
          case 'till': return 'MPESA_TILL';
          case 'paybill': return 'MPESA_TILL';
          case 'bank_transfer': return 'NATIONAL_BANK';
          case 'card': return 'EQUITY_TILL';
          case 'mobile_money': return 'MPESA_TILL';
          default: return 'CASH';
        }
      };

      const response = await api.post(
        "/inventory/dispense/otc/",
        {
          items: selectedItems.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
          payment_mode: getMappedPaymentMode(),
          customer_id: setup.customerType === 'credit' ? setup.creditCustomerId : null,
          patient_name: setup.patientName,
          pricing_tier: setup.pricingTier.toUpperCase(),
          discount: 0,
          branch_id: branchId,
        },
        { skipGlobalErrorNotification: true },
      );
      const order = response.data?.data ?? response.data;
      setLastOrder(order);
      setSelectedItems([]);
      setSearchTerm("");
      setSearchResults(catalog);
      void loadCatalog();
      notify.success(
        `Sale recorded. Total: KES ${Number(order?.total_amount ?? calculateTotal()).toLocaleString()}.`,
        "success"
      );
      setShowReceipt(true);
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

  const resetSale = () => {
    setLastOrder(null);
    setSaleError("");
    setShowReceipt(false);
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
      <>
        {showReceipt && (
          <ReceiptModal order={lastOrder} onClose={() => setShowReceipt(false)} />
        )}
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
              onClick={() => setShowReceipt(true)}
            >
              <PrinterIcon className="h-5 w-5" /> Print Receipt
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!setup.complete) {
    return (
      <div className="max-w-xl mx-auto glass-card rounded-2xl p-8 border" style={{ borderColor: "var(--border-primary)" }}>
        <h2 className="text-2xl font-bold mb-6 text-center">OTC Sale Setup</h2>
        
        <div className="space-y-6">
          <div>
            <label className="form-label font-bold mb-3 block">Customer Type</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`p-4 rounded-xl border-2 text-center transition-all ${setup.customerType === 'walk-in' ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                onClick={() => setSetup({ ...setup, customerType: 'walk-in' })}
              >
                Walk-in
              </button>
              <button
                type="button"
                className={`p-4 rounded-xl border-2 text-center transition-all ${setup.customerType === 'credit' ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-transparent bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                onClick={() => setSetup({ ...setup, customerType: 'credit' })}
              >
                Credit Customer
              </button>
            </div>
          </div>

          {setup.customerType === 'walk-in' ? (
            <div>
              <label className="form-label">Patient Name (Optional)</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Leave blank if not needed..."
                value={setup.patientName}
                onChange={e => setSetup({ ...setup, patientName: e.target.value })}
              />
            </div>
          ) : (
            <div>
              <label className="form-label">Select Registered Customer</label>
              {loadingCustomers ? (
                <p className="text-sm text-gray-500">Loading customers...</p>
              ) : (
                <select
                  className="form-input w-full"
                  value={setup.creditCustomerId}
                  onChange={e => setSetup({ ...setup, creditCustomerId: e.target.value })}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="form-label font-bold mb-3 block">Pricing Tier</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`p-3 rounded-xl border transition-all ${setup.pricingTier === 'retail' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setSetup({ ...setup, pricingTier: 'retail' })}
              >
                Retail
              </button>
              <button
                type="button"
                className={`p-3 rounded-xl border transition-all ${setup.pricingTier === 'wholesale' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                onClick={() => setSetup({ ...setup, pricingTier: 'wholesale' })}
              >
                Wholesale
              </button>
            </div>
          </div>
          
          <div className="pt-4 mt-6 border-t" style={{ borderColor: "var(--border-primary)" }}>
            <button
              type="button"
              className="btn-primary w-full py-3 rounded-xl font-bold disabled:opacity-50"
              disabled={setup.customerType === 'credit' && !setup.creditCustomerId}
              onClick={() => {
                setPaymentMethod(setup.customerType === 'credit' ? 'other' : 'cash');
                setSetup({ ...setup, complete: true });
              }}
            >
              Continue to Sale
            </button>
          </div>
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
            placeholder="Products are listed. Type to narrow down..."
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
                    <strong>{outOfStockHint.activeBranchName || activeBranch?.name || "your branch"}</strong>.
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
                            onClick={() => {
                              notify.info("Transfer Request", "Opening branch transfers.");
                              window.location.href = "/inventory?tab=transfers";
                            }}
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
            const qty = getProductBranchQuantity(product, branchId, activeBranch?.name);
            const price = getProductDisplayPrice(product);
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => addToSale(product)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${qty <= 0 ? "opacity-80 bg-amber-50" : ""}`}
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
                  <p className="font-semibold text-sm break-words">{item.name}</p>
                  <p className="text-xs">{fmt(item.unitPrice)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQuantity(item.id, -1)} className="p-1 rounded-lg border bg-white hover:bg-slate-50 text-slate-600 transition-colors">
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    onBlur={() => handleQuantityBlur(item.id)}
                    className="w-16 text-center font-bold text-sm border rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    style={{ borderColor: "var(--border-primary)" }}
                  />
                  <button type="button" onClick={() => updateQuantity(item.id, 1)} className="p-1 rounded-lg border bg-white hover:bg-slate-50 text-slate-600 transition-colors">
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
          <div className="mb-3">
            <label className="form-label text-xs">Payment method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="form-input w-full"
            >
              <option value="cash">Cash</option>
              <option value="till">Till</option>
              <option value="paybill">Paybill</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="other">Other</option>
            </select>
          </div>
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
