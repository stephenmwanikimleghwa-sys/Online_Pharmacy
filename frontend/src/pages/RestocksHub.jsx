import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { getRestockNeeds } from "../services/procurementService";
import PageHeader from "../components/PageHeader";
import { PanelSkeleton } from "../components/ui/Skeleton";

const buildReorderUrl = (item) => {
  const params = new URLSearchParams();
  if (item.recommended_supplier_id) params.set("supplier", String(item.recommended_supplier_id));
  if (item.product_id) params.set("product", String(item.product_id));
  if (item.suggested_quantity) params.set("qty", String(item.suggested_quantity));
  if (item.recommended_unit_price != null) params.set("price", String(item.recommended_unit_price));
  if (item.reason) params.set("reason", String(item.reason).slice(0, 280));
  if (item.branch_id) params.set("branch", String(item.branch_id));
  params.set(
    "notes",
    `Restock: ${item.product_name} at ${item.branch_name} (stock ${item.stock_quantity}, reorder at ${item.reorder_level})`,
  );
  return `/purchase-orders/new?${params.toString()}`;
};

/**
 * Admin-only network restock hub.
 * Lists needs for every branch (active first) with Supplier Intel tips.
 * Ordering for another branch requires an explicit branch switch first.
 */
const RestocksHub = () => {
  const navigate = useNavigate();
  const { user, activeBranch, switchBranch } = useAuth();
  const { notify } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [switchModal, setSwitchModal] = useState(null);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getRestockNeeds({ per_branch: 80 });
      setData(res.data || null);
    } catch (err) {
      setData(null);
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.error?.message ||
        (err?.response?.status === 404
          ? "Restock needs is not on the server yet. Wait for the latest deploy, then refresh."
          : null) ||
        (err?.response?.status === 403
          ? "Only admins can open network Restocks."
          : null) ||
        (!err?.response
          ? "Could not reach the server. Check your connection and try again."
          : null);
      setError(detail || "Could not load restock needs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "admin" && !user?.is_superuser) {
      navigate("/", { replace: true });
      return;
    }
    void load();
  }, [user, navigate, load, activeBranch?.id]);

  const branches = useMemo(() => data?.branches || [], [data]);

  const startRestock = (item, branchGroup) => {
    const targetId = item.branch_id || branchGroup.branch_id;
    const targetName = item.branch_name || branchGroup.branch_name;
    const onActive = activeBranch?.id && Number(activeBranch.id) === Number(targetId);

    if (onActive) {
      navigate(buildReorderUrl(item));
      return;
    }

    setSwitchModal({
      item,
      branchId: targetId,
      branchName: targetName,
      fromName: activeBranch?.name || "your current branch",
    });
  };

  const confirmSwitchAndOrder = async () => {
    if (!switchModal) return;
    setSwitching(true);
    try {
      const result = await switchBranch(switchModal.branchId);
      if (!result?.success) {
        notify.error(
          "Could not switch",
          typeof result?.error === "string"
            ? result.error
            : "Branch switch failed. Stay on this page and try again.",
        );
        return;
      }
      const url = buildReorderUrl(switchModal.item);
      setSwitchModal(null);
      navigate(url);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-6">
      <PageHeader
        title="Restocks"
        description="Every product that needs restocking across all branches. Supplier tips come from Stock received history. You can only create an order while logged into that branch."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/supplier-intelligence"
              className="px-4 py-2.5 rounded-xl text-sm font-bold border"
              style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
            >
              Supplier Intel
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 inline-flex items-center gap-2"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        }
      />

      {activeBranch ? (
        <div
          className="rounded-2xl border p-4 flex gap-3"
          style={{ background: "var(--brand-mist)", borderColor: "var(--brand-border-soft)" }}
          role="status"
        >
          <BuildingOffice2Icon className="w-6 h-6 flex-shrink-0" style={{ color: "var(--color-primary)" }} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--color-primary)" }}>
              Working branch
            </p>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              You are logged into <strong>{activeBranch.name}</strong>. Restock orders for other
              branches will ask you to switch first — then stock and purchases stay under that branch.
            </p>
          </div>
        </div>
      ) : null}

      {data?.summary ? (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {data.summary}
        </p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <PanelSkeleton rows={6} />
      ) : !branches.length ? (
        <div className="glass-card rounded-xl border p-8 text-center" style={{ borderColor: "var(--border-primary)" }}>
          <p className="font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Nothing needs restocking right now
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            All active products are above their reorder levels.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {branches.map((branch) => (
            <section
              key={branch.branch_id}
              className="glass-card rounded-xl border overflow-hidden"
              style={{ borderColor: branch.is_active ? "var(--brand-border-soft)" : "var(--border-primary)" }}
            >
              <div
                className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b"
                style={{
                  borderColor: "var(--border-primary)",
                  background: branch.is_active ? "var(--brand-mist)" : "var(--bg-field)",
                }}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <BuildingOffice2Icon
                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                    style={{ color: "var(--color-primary)" }}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                        {branch.branch_name}
                      </h2>
                      {branch.is_active ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Your branch
                        </span>
                      ) : (
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border"
                          style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
                        >
                          Switch to order
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      {branch.count} need restock
                      {branch.out_count ? ` · ${branch.out_count} out of stock` : ""}
                      {branch.listed < branch.count
                        ? ` · showing ${branch.listed} most urgent`
                        : ""}
                    </p>
                  </div>
                </div>
                {!branch.is_active ? (
                  <button
                    type="button"
                    className="px-3 py-2 rounded-xl text-xs font-bold border self-start"
                    style={{ borderColor: "var(--border-primary)", color: "var(--text-primary)" }}
                    onClick={() =>
                      setSwitchModal({
                        item: null,
                        branchId: branch.branch_id,
                        branchName: branch.branch_name,
                        fromName: activeBranch?.name || "your current branch",
                        switchOnly: true,
                      })
                    }
                  >
                    Switch to {branch.branch_name}
                  </button>
                ) : null}
              </div>

              <ul className="divide-y" style={{ borderColor: "var(--border-primary)" }}>
                {(branch.items || []).map((item) => (
                  <li
                    key={`${item.branch_id}-${item.product_id}`}
                    className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3"
                    style={{ borderColor: "var(--border-primary)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-bold truncate" style={{ color: "var(--text-primary)" }}>
                          {item.product_name}
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            item.urgency === "out"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.urgency === "out" ? "Out of stock" : "Low stock"}
                        </span>
                      </div>
                      <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                        On hand: <strong>{item.stock_quantity}</strong> · Reorder at{" "}
                        <strong>{item.reorder_level}</strong>
                        {item.suggested_quantity ? ` · Suggested qty: ${item.suggested_quantity}` : ""}
                      </p>
                      <p className="text-sm leading-relaxed flex gap-2" style={{ color: "var(--text-primary)" }}>
                        <LightBulbIcon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-primary)" }} />
                        <span>{item.reason || "No supplier tip yet — record Stock received to unlock tips."}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => startRestock(item, branch)}
                        className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold text-white inline-flex items-center gap-1.5"
                      >
                        <ShoppingCartIcon className="w-4 h-4" />
                        {branch.is_active
                          ? item.recommended_supplier_name
                            ? `Order from ${item.recommended_supplier_name}`
                            : "Create order"
                          : `Switch & order${item.recommended_supplier_name ? ` · ${item.recommended_supplier_name}` : ""}`}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {switchModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close"
            onClick={() => !switching && setSwitchModal(null)}
          />
          <div
            className="relative w-full max-w-md rounded-2xl border p-6 shadow-xl space-y-4"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-primary)" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="restock-switch-title"
          >
            <h3 id="restock-switch-title" className="font-display font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              Switch to {switchModal.branchName}?
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              You are leaving <strong style={{ color: "var(--text-primary)" }}>{switchModal.fromName}</strong> and
              will work at <strong style={{ color: "var(--text-primary)" }}>{switchModal.branchName}</strong>.
              {switchModal.switchOnly
                ? " After the switch you can restock products for that branch."
                : ` The purchase order for ${switchModal.item?.product_name || "this product"} will be recorded under ${switchModal.branchName}.`}
            </p>
            <p className="text-xs rounded-xl border p-3" style={{ borderColor: "var(--brand-border-soft)", background: "var(--brand-mist)", color: "var(--text-primary)" }}>
              Confirmation: stock received, purchase orders, and inventory changes after this will belong to{" "}
              <strong>{switchModal.branchName}</strong> until you switch again.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={switching}
                onClick={() => setSwitchModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold border"
                style={{ borderColor: "var(--border-primary)", color: "var(--text-secondary)" }}
              >
                Stay here
              </button>
              <button
                type="button"
                disabled={switching}
                onClick={async () => {
                  if (switchModal.switchOnly) {
                    setSwitching(true);
                    try {
                      const result = await switchBranch(switchModal.branchId);
                      if (!result?.success) {
                        notify.error("Could not switch", "Branch switch failed. Try again.");
                        return;
                      }
                      setSwitchModal(null);
                      void load();
                    } finally {
                      setSwitching(false);
                    }
                    return;
                  }
                  await confirmSwitchAndOrder();
                }}
                className="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              >
                {switching
                  ? "Switching…"
                  : switchModal.switchOnly
                    ? `Go to ${switchModal.branchName}`
                    : `Switch and continue restock`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RestocksHub;
