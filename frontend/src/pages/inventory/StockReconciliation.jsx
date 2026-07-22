import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { ExclamationTriangleIcon, CheckIcon } from "@heroicons/react/24/outline";

/**
 * Stock reconciliation screen.
 *
 * Lists stock discrepancies raised when an offline-synced sale oversold (two
 * terminals sold the same stock while disconnected). A manager reconciles each
 * against a physical count and resolves it. See backend
 * inventory/views/discrepancies.py and inventory/services/sync.py.
 */
const StockReconciliation = () => {
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["discrepancies", { resolved: showResolved }],
    queryFn: () =>
      api
        .get(`/inventory/discrepancies/?resolved=${showResolved}`, {
          skipGlobalErrorNotification: true,
        })
        .then((r) => r.data?.data?.discrepancies ?? r.data?.discrepancies ?? []),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, note }) =>
      api.post(`/inventory/discrepancies/${id}/resolve/`, { note }),
    onSuccess: () => {
      notify.success("Discrepancy resolved.", "success");
      void queryClient.invalidateQueries({ queryKey: ["discrepancies"] });
    },
    onError: () => notify.error("Error", "Could not resolve the discrepancy."),
  });

  const discrepancies = data ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Stock Reconciliation
          </h1>
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />
          Show resolved
        </label>
      </div>

      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        These arise when sales recorded offline exceed the stock the server held —
        usually two points of sale selling the same items while disconnected. The
        sale was still recorded; confirm the true count on the shelf, adjust stock
        if needed, then mark the discrepancy resolved.
      </p>

      {isLoading ? (
        <div className="py-12 text-center" style={{ color: "var(--text-secondary)" }}>
          Loading…
        </div>
      ) : discrepancies.length === 0 ? (
        <div className="py-12 text-center" style={{ color: "var(--text-secondary)" }}>
          {showResolved ? "No resolved discrepancies." : "No open discrepancies. 🎉"}
        </div>
      ) : (
        <div className="space-y-2">
          {discrepancies.map((d) => (
            <div
              key={d.id}
              className="data-cell flex items-center justify-between gap-4 p-4 rounded-xl"
            >
              <div>
                <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {d.product_name}
                </div>
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {d.branch_name} · had {d.expected_quantity}, sold {d.requested_quantity} ·{" "}
                  <span className="text-amber-600 font-semibold">
                    oversold {d.oversold_quantity}
                  </span>{" "}
                  · {new Date(d.created_at).toLocaleString()}
                </div>
                {d.resolved && d.resolution_note ? (
                  <div className="text-xs mt-1 italic" style={{ color: "var(--text-secondary)" }}>
                    Note: {d.resolution_note}
                  </div>
                ) : null}
              </div>
              {!d.resolved ? (
                <button
                  onClick={() => {
                    const note = window.prompt(
                      "Resolution note (e.g. 'physical count corrected to 0, restocked 5'):",
                      "",
                    );
                    if (note === null) return;
                    resolveMutation.mutate({ id: d.id, note });
                  }}
                  disabled={resolveMutation.isPending}
                  className="btn-primary flex items-center gap-1 px-3 py-2 rounded-lg text-sm"
                >
                  <CheckIcon className="w-4 h-4" /> Resolve
                </button>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckIcon className="w-4 h-4" /> Resolved
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockReconciliation;
