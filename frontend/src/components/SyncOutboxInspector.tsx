import { useCallback, useEffect, useState } from "react";
import ModalFrame from "./ModalFrame";
import { useSync } from "../context/SyncContext";
import {
  listOutboxOps,
  MAX_AUTO_RETRY_ATTEMPTS,
  summarizeOutboxOp,
  type OutboxOp,
} from "../lib/offlineDb";

function formatWhen(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function statusLabel(op: OutboxOp): string {
  if (op.status === "failed" && op.attempts >= MAX_AUTO_RETRY_ATTEMPTS) {
    return "Needs attention";
  }
  if (op.status === "failed") return "Retrying";
  if (op.status === "syncing") return "Uploading";
  return "Queued";
}

function statusTone(op: OutboxOp): string {
  if (op.status === "failed" && op.attempts >= MAX_AUTO_RETRY_ATTEMPTS) {
    return "text-rose-600 bg-rose-50";
  }
  if (op.status === "syncing") return "text-amber-700 bg-amber-50";
  return "text-slate-600 bg-slate-100";
}

/**
 * Lists IndexedDB outbox ops so staff can see which sale/intake is stuck,
 * retry permanently failed rows, and confirm the queue is empty.
 */
export default function SyncOutboxInspector({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { online, syncing, syncNow, retryOutboxOp, retryAllFailedOutbox } = useSync();
  const [ops, setOps] = useState<OutboxOp[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setOps(await listOutboxOps());
    } catch {
      setOps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void refresh();
    const id = window.setInterval(() => void refresh(), 4000);
    return () => window.clearInterval(id);
  }, [isOpen, refresh]);

  const handleRetryOne = async (clientUuid: string) => {
    setBusyId(clientUuid);
    try {
      await retryOutboxOp(clientUuid);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleRetryAll = async () => {
    setBusyId("all");
    try {
      await retryAllFailedOutbox();
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleSyncNow = async () => {
    setBusyId("sync");
    try {
      await syncNow();
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const failedCount = ops.filter(
    (o) => o.status === "failed" && o.attempts >= MAX_AUTO_RETRY_ATTEMPTS,
  ).length;

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Sync queue"
      description="Sales and stock changes waiting to upload. If a row says Needs attention, reports and stock may be wrong until it succeeds."
      maxWidthClass="max-w-2xl"
      footer={
        <>
          {failedCount > 0 && (
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 bg-white disabled:opacity-50"
              disabled={busyId !== null || !online}
              onClick={() => void handleRetryAll()}
            >
              {busyId === "all" ? "Retrying…" : `Retry failed (${failedCount})`}
            </button>
          )}
          <button
            type="button"
            className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            disabled={busyId !== null || !online || syncing || ops.length === 0}
            onClick={() => void handleSyncNow()}
          >
            {busyId === "sync" || syncing ? "Syncing…" : "Sync now"}
          </button>
        </>
      }
    >
      {!online && (
        <p className="mb-4 text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">
          Device is offline. Queued items stay here until you reconnect.
        </p>
      )}

      {loading && ops.length === 0 ? (
        <p className="text-sm text-slate-500">Loading queue…</p>
      ) : ops.length === 0 ? (
        <p className="text-sm text-slate-500">Queue is empty — everything has uploaded.</p>
      ) : (
        <ul className="space-y-3">
          {ops.map((op) => (
            <li
              key={op.client_uuid}
              className="rounded-xl border border-slate-200 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${statusTone(op)}`}
                    >
                      {statusLabel(op)}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {summarizeOutboxOp(op)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatWhen(op.created_at)} · {op.attempts} attempt
                    {op.attempts === 1 ? "" : "s"}
                    {op.branch_id != null ? ` · branch #${op.branch_id}` : ""}
                  </p>
                  {op.last_error ? (
                    <p className="mt-1 text-xs text-rose-600 break-words">{op.last_error}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-slate-400 font-mono truncate">
                    {op.client_uuid}
                  </p>
                </div>
                {(op.status === "failed" || op.status === "pending") && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary shrink-0 disabled:opacity-50"
                    disabled={busyId !== null || !online}
                    onClick={() => void handleRetryOne(op.client_uuid)}
                  >
                    {busyId === op.client_uuid ? "…" : "Retry"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </ModalFrame>
  );
}
