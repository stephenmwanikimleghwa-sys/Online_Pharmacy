import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

// ─── Helper ────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 });

const EMPTY_ITEM = () => ({
  _key: Math.random(),
  product_id: "",
  product_name: "",
  quantity_received: "",
  cost_price: "",
  selling_price: "",
  wholesale_price: "",
  expiry_date: "",
  batch_number: "",
});

// ─── Product Search Dropdown ────────────────────────────────────────────────
const ProductSearch = ({ value, onChange, branchId }) => {
  const [query, setQuery] = useState(value?.name || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    try {
      const res = await api.get("/inventory/list/", { params: { search: q, branch: branchId, per_page: 20 } });
      const items = res.data?.results || res.data?.data || res.data || [];
      setResults(Array.isArray(items) ? items : []);
    } catch { setResults([]); }
  }, [branchId]);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange({ product_id: "", product_name: val });
    setOpen(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(val), 350);
  };

  const select = (p) => {
    setQuery(p.name);
    setOpen(false);
    setResults([]);
    onChange({
      product_id: p.id,
      product_name: p.name,
      selling_price: p.price || p.retail_price || "",
      wholesale_price: p.wholesale_price || p.pricing_tier?.wholesale_price || "",
      cost_price: p.cost_price || p.pricing_tier?.buying_price || "",
    });
  };

  return (
    <div className="relative">
      <input
        className="form-input w-full text-sm"
        placeholder="Search product name..."
        value={query}
        onChange={handleInput}
        onFocus={() => query && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 rounded-xl border shadow-xl overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}>
          {results.map((p) => (
            <button key={p.id} type="button"
              className="w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 border-b last:border-0 transition-colors"
              style={{ borderColor: "var(--border-primary)" }}
              onMouseDown={() => select(p)}>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{p.name}</p>
              {p.price && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>KES {fmt(p.price)}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const NewStockIntake = ({ onClose, onSuccess }) => {
  const { activeBranch, user } = useAuth();

  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);

  const [supplierId, setSupplierId] = useState("");
  const [branchId, setBranchId] = useState(activeBranch?.id || "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([EMPTY_ITEM()]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, bRes] = await Promise.all([
          api.get("/inventory/suppliers/"),
          api.get("/auth/branches/"),
        ]);
        setSuppliers(sRes.data?.results || sRes.data || []);
        const bData = bRes.data?.results || bRes.data?.data || bRes.data || [];
        setBranches(Array.isArray(bData) ? bData : []);
      } catch (e) {
        } finally {
        setLoadingInit(false);
      }
    };
    load();
  }, []);

  const addItem = () => setItems((prev) => [...prev, EMPTY_ITEM()]);

  const removeItem = (key) => setItems((prev) => prev.filter((i) => i._key !== key));

  const updateItem = (key, changes) => {
    setItems((prev) => prev.map((i) => (i._key === key ? { ...i, ...changes } : i)));
  };

  const totalCost = items.reduce((acc, i) => {
    const qty = parseFloat(i.quantity_received) || 0;
    const cp = parseFloat(i.cost_price) || 0;
    return acc + qty * cp;
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validItems = items.filter((i) => i.product_id && parseFloat(i.quantity_received) > 0);
    if (!supplierId) return setError("Please select a supplier.");
    if (!branchId) return setError("Please select a receiving branch.");
    if (validItems.length === 0) return setError("Please add at least one product with quantity > 0.");

    setSubmitting(true);
    try {
      const res = await api.post("/inventory/stock-intake/bulk/", {
        supplier_id: supplierId,
        branch_id: branchId,
        invoice_number: invoiceNumber,
        payment_status: paymentStatus,
        notes,
        products: validItems.map((i) => ({
          product_id: i.product_id,
          quantity_received: parseInt(i.quantity_received, 10),
          cost_price: parseFloat(i.cost_price) || 0,
          selling_price: parseFloat(i.selling_price) || 0,
          wholesale_price: parseFloat(i.wholesale_price) || 0,
          expiry_date: i.expiry_date || null,
          batch_number: i.batch_number || "",
        })),
      });

      const msg = res.data?.message || `${validItems.length} product(s) received successfully.`;
      setSuccess({ message: msg, items: validItems, totalCost });
      if (onSuccess) onSuccess();
    } catch (err) {
      const detail = err.response?.data?.message || err.response?.data?.detail || "Stock intake failed. Please try again.";
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8 px-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Stock Received!</h3>
        <p className="mb-2" style={{ color: "var(--text-secondary)" }}>{success.message}</p>
        <p className="text-lg font-bold text-emerald-600 mb-8">Total Value: KES {fmt(success.totalCost)}</p>
        <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--border-primary)" }}>
          <table className="w-full text-sm text-left">
            <thead style={{ background: "var(--bg-field)" }}>
              <tr>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Product</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: "var(--text-secondary)" }}>Qty</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: "var(--text-secondary)" }}>Unit Cost</th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-right" style={{ color: "var(--text-secondary)" }}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
              {success.items.map((i) => (
                <tr key={i._key}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{i.product_name}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>{i.quantity_received}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>KES {fmt(i.cost_price)}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: "var(--text-primary)" }}>KES {fmt((parseFloat(i.quantity_received) || 0) * (parseFloat(i.cost_price) || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={onClose} className="btn-primary px-8 py-3 rounded-xl font-bold">Close</button>
      </div>
    );
  }

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Supplier <span className="text-red-500">*</span></label>
          <select className="form-input w-full" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
            <option value="">-- Select Supplier --</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Receiving Branch <span className="text-red-500">*</span></label>
          <select className="form-input w-full" value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
            <option value="">-- Select Branch --</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Invoice / Receipt No.</label>
          <input className="form-input w-full" placeholder="e.g. INV-2024-001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>
        <div>
          <label className="form-label font-bold">Payment Status <span className="text-red-500">*</span></label>
          <div className="flex gap-3 mt-1">
            {["PAID", "CREDIT", "PARTIAL"].map((s) => (
              <button key={s} type="button"
                className={`flex-1 py-2.5 rounded-xl border font-bold text-sm transition-all ${paymentStatus === s
                  ? s === "PAID" ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : s === "CREDIT" ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                onClick={() => setPaymentStatus(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="form-label font-bold text-base mb-0">Products Received</label>
          <button type="button" onClick={addItem}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 transition-colors border border-emerald-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item._key} className="rounded-xl border p-4 relative"
              style={{ background: "var(--bg-field)", borderColor: "var(--border-primary)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">#{idx + 1}</span>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(item._key)}
                    className="ml-auto text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="col-span-2 sm:col-span-3 lg:col-span-2">
                  <label className="form-label text-xs">Product Name *</label>
                  <ProductSearch
                    value={{ name: item.product_name }}
                    branchId={branchId}
                    onChange={(sel) => updateItem(item._key, sel)}
                  />
                </div>
                <div>
                  <label className="form-label text-xs">Qty *</label>
                  <input type="number" min="1" className="form-input w-full text-sm" placeholder="0"
                    value={item.quantity_received}
                    onChange={(e) => updateItem(item._key, { quantity_received: e.target.value })} />
                </div>
                <div>
                  <label className="form-label text-xs">Cost Price (KES)</label>
                  <input type="number" step="0.01" min="0" className="form-input w-full text-sm" placeholder="0.00"
                    value={item.cost_price}
                    onChange={(e) => updateItem(item._key, { cost_price: e.target.value })} />
                </div>
                <div>
                  <label className="form-label text-xs">Selling Price</label>
                  <input type="number" step="0.01" min="0" className="form-input w-full text-sm" placeholder="0.00"
                    value={item.selling_price}
                    onChange={(e) => updateItem(item._key, { selling_price: e.target.value })} />
                </div>
                <div>
                  <label className="form-label text-xs">Wholesale Price</label>
                  <input type="number" step="0.01" min="0" className="form-input w-full text-sm" placeholder="0.00"
                    value={item.wholesale_price}
                    onChange={(e) => updateItem(item._key, { wholesale_price: e.target.value })} />
                </div>
                <div>
                  <label className="form-label text-xs">Expiry Date</label>
                  <input type="date" className="form-input w-full text-sm"
                    value={item.expiry_date}
                    onChange={(e) => updateItem(item._key, { expiry_date: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="form-label text-xs">Batch Number</label>
                  <input type="text" className="form-input w-full text-sm" placeholder="e.g. BT-2024-001"
                    value={item.batch_number}
                    onChange={(e) => updateItem(item._key, { batch_number: e.target.value })} />
                </div>
                {item.quantity_received && item.cost_price && (
                  <div className="flex items-end pb-1">
                    <span className="text-sm font-bold text-emerald-600">
                      = KES {fmt((parseFloat(item.quantity_received) || 0) * (parseFloat(item.cost_price) || 0))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="form-label">Notes (Optional)</label>
        <textarea className="form-input w-full" rows={2} placeholder="Any remarks about this delivery..."
          value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {/* Total & Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{error}</div>
      )}
      <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border-primary)" }}>
        <div>
          <p className="text-xs uppercase tracking-widest font-bold" style={{ color: "var(--text-secondary)" }}>Invoice Total</p>
          <p className="text-2xl font-display font-bold text-emerald-600">KES {fmt(totalCost)}</p>
          {paymentStatus === "CREDIT" && (
            <p className="text-xs text-amber-600 font-semibold mt-0.5">⚠ Will add KES {fmt(totalCost)} to supplier credit</p>
          )}
        </div>
        <div className="flex gap-3">
          {onClose && (
            <button type="button" onClick={onClose}
              className="px-6 py-3 rounded-xl border font-bold text-sm transition-colors hover:bg-gray-50"
              style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={submitting}
            className="btn-primary px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-60">
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Processing...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>Confirm Intake</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default NewStockIntake;
