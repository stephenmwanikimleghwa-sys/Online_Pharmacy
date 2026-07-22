/**
 * Durable offline outbox (IndexedDB).
 *
 * Writes made while the branch is offline (sales, intake, adjustments) are
 * queued here and replayed to POST /api/inventory/sync/ once connectivity
 * returns. IndexedDB (not localStorage/sessionStorage) so the queue survives a
 * tab close or full machine reboot — the whole point for branches that lose
 * connectivity for long stretches.
 *
 * No external dependency: a minimal promise wrapper over the native API keeps
 * the bundle small and avoids a build-time package.
 */

export type OutboxOpType = "sale" | "intake" | "adjustment";
export type OutboxStatus = "pending" | "syncing" | "failed";

export interface OutboxOp {
  /** Client-generated idempotency key; the server dedupes on this. */
  client_uuid: string;
  op_type: OutboxOpType;
  payload: unknown;
  status: OutboxStatus;
  created_at: number;
  attempts: number;
  last_error?: string;
  /** Branch this op was recorded against, so it syncs under the right scope. */
  branch_id?: number | null;
}

const DB_NAME = "transcounty_offline";
const DB_VERSION = 1;
const STORE = "outbox";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "client_uuid" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

/** A short unique id without pulling in a uuid library. */
export function newClientUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Queue a new operation. Returns the stored record. */
export async function enqueueOp(
  op_type: OutboxOpType,
  payload: unknown,
  branch_id?: number | null,
): Promise<OutboxOp> {
  const record: OutboxOp = {
    client_uuid: newClientUuid(),
    op_type,
    payload,
    status: "pending",
    created_at: Date.now(),
    attempts: 0,
    branch_id: branch_id ?? null,
  };
  await tx("readwrite", (store) => store.put(record));
  return record;
}

/** All ops not yet acknowledged (pending or failed), oldest first. */
export async function getUnsyncedOps(): Promise<OutboxOp[]> {
  const all = await tx<OutboxOp[]>("readonly", (store) => store.getAll());
  return all
    .filter((o) => o.status !== "syncing")
    .sort((a, b) => a.created_at - b.created_at);
}

export async function countPending(): Promise<number> {
  const all = await tx<OutboxOp[]>("readonly", (store) => store.getAll());
  return all.filter((o) => o.status !== "syncing").length;
}

export async function markSyncing(client_uuid: string): Promise<void> {
  const existing = await tx<OutboxOp | undefined>("readonly", (store) =>
    store.get(client_uuid),
  );
  if (!existing) return;
  existing.status = "syncing";
  existing.attempts += 1;
  await tx("readwrite", (store) => store.put(existing));
}

export async function markFailed(client_uuid: string, error: string): Promise<void> {
  const existing = await tx<OutboxOp | undefined>("readonly", (store) =>
    store.get(client_uuid),
  );
  if (!existing) return;
  existing.status = "failed";
  existing.last_error = error;
  await tx("readwrite", (store) => store.put(existing));
}

/** Remove an op once the server has acknowledged it (applied or duplicate). */
export async function removeOp(client_uuid: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(client_uuid));
}

/** Wipe the entire outbox. NOTE: do NOT call this on logout — the outbox holds
 * unsynced SALES, which are business-critical and must survive a logout (staff
 * may log out on a shared machine before the branch is back online). This exists
 * only for explicit admin/troubleshooting use after confirming the queue is
 * empty or intentionally discarded. Read-cache PHI is cleared separately on
 * logout via queryClient.clear() + clearApiCache(). */
export async function clearOutbox(): Promise<void> {
  await tx("readwrite", (store) => store.clear());
}
