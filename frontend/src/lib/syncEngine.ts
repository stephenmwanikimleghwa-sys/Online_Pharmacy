/**
 * Offline sync engine.
 *
 * Flushes queued outbox operations (offlineDb) to POST /api/inventory/sync/
 * whenever connectivity is available. Because every op carries a client_uuid
 * the server dedupes on, flushing is safe to trigger often and to retry — an
 * op applied once will simply come back as "duplicate" on resend.
 *
 * Triggers wired in SyncProvider: the browser `online` event, window focus,
 * a periodic timer, and an explicit call after a write is enqueued.
 */
import api from "../services/api";
import { queryClient } from "./queryClient";
import {
  getUnsyncedOps,
  markSyncing,
  markFailed,
  removeOp,
  type OutboxOp,
} from "./offlineDb";

export interface SyncResultItem {
  client_uuid: string;
  status: "applied" | "duplicate" | "conflict" | "error";
  server_id?: string;
  discrepancy?: boolean;
  error?: string;
}

export interface FlushSummary {
  attempted: number;
  applied: number;
  duplicate: number;
  failed: number;
  discrepancies: number;
}

let flushing = false;

/** Invalidate the read queries that a synced write would have changed. */
function invalidateAfterSync(): void {
  for (const key of [
    "stock",
    "products",
    "inventory",
    "dashboard",
    "dispensations",
    "stockIntakes",
    "discrepancies",
  ]) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

/**
 * Attempt to flush all unsynced ops. Returns a summary. Never throws — network
 * failures leave ops queued for the next attempt. Concurrency-guarded so
 * overlapping triggers (online + focus + timer) don't double-send.
 */
export async function flushOutbox(): Promise<FlushSummary> {
  const empty: FlushSummary = {
    attempted: 0, applied: 0, duplicate: 0, failed: 0, discrepancies: 0,
  };
  if (flushing) return empty;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return empty;

  flushing = true;
  try {
    const ops = await getUnsyncedOps();
    if (ops.length === 0) return empty;

    // Group by branch so each request syncs under one branch scope. Most
    // sessions are a single branch, so this is usually one group.
    const byBranch = new Map<number | null | undefined, OutboxOp[]>();
    for (const op of ops) {
      const list = byBranch.get(op.branch_id) ?? [];
      list.push(op);
      byBranch.set(op.branch_id, list);
    }

    const summary: FlushSummary = { ...empty };

    for (const [branchId, group] of byBranch) {
      await Promise.all(group.map((o) => markSyncing(o.client_uuid)));
      summary.attempted += group.length;

      try {
        const body = {
          branch_id: branchId ?? undefined,
          operations: group.map((o) => ({
            client_uuid: o.client_uuid,
            op_type: o.op_type,
            payload: o.payload,
            client_created_at: new Date(o.created_at).toISOString(),
          })),
        };
        const resp = await api.post("/inventory/sync/", body, {
          // This is a background flush; surface failures via the sync UI, not a
          // global error toast.
          skipGlobalErrorNotification: true,
        });
        const results: SyncResultItem[] = resp.data?.results ?? resp.data?.data?.results ?? [];

        for (const r of results) {
          if (r.status === "applied" || r.status === "duplicate") {
            await removeOp(r.client_uuid);
            if (r.status === "applied") summary.applied += 1;
            else summary.duplicate += 1;
            if (r.discrepancy) summary.discrepancies += 1;
          } else {
            await markFailed(r.client_uuid, r.error ?? r.status);
            summary.failed += 1;
          }
        }
      } catch (err) {
        // Network/5xx: leave the group queued (revert to pending) for retry.
        const message = err instanceof Error ? err.message : "sync request failed";
        await Promise.all(group.map((o) => markFailed(o.client_uuid, message)));
        summary.failed += group.length;
      }
    }

    if (summary.applied > 0 || summary.duplicate > 0) {
      invalidateAfterSync();
    }
    return summary;
  } finally {
    flushing = false;
  }
}
