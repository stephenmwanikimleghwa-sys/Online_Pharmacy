import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { flushOutbox } from "../lib/syncEngine";
import { countPending, enqueueOp, type OutboxOpType } from "../lib/offlineDb";

interface SyncContextType {
  /** Browser connectivity. */
  online: boolean;
  /** Ops queued locally and not yet acknowledged by the server. */
  pending: number;
  /** True while a flush is in progress. */
  syncing: boolean;
  /** Epoch ms of the last successful flush, or null. */
  lastSyncedAt: number | null;
  /** Discrepancies detected during the most recent flush (oversell events). */
  lastDiscrepancies: number;
  /** Queue a write; syncs immediately if online, else waits for reconnect. */
  queueWrite: (
    opType: OutboxOpType,
    payload: unknown,
    branchId?: number | null,
  ) => Promise<void>;
  /** Force a flush attempt now. */
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

// Periodic retry cadence while there are queued ops and we're online.
const FLUSH_INTERVAL_MS = 30_000;

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [lastDiscrepancies, setLastDiscrepancies] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshPending = useCallback(async () => {
    try {
      setPending(await countPending());
    } catch {
      /* IndexedDB unavailable — leave count as-is. */
    }
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const summary = await flushOutbox();
      if (summary.applied > 0 || summary.duplicate > 0) {
        setLastSyncedAt(Date.now());
      }
      if (summary.discrepancies > 0) {
        setLastDiscrepancies(summary.discrepancies);
      }
    } finally {
      setSyncing(false);
      await refreshPending();
    }
  }, [refreshPending]);

  const queueWrite = useCallback(
    async (opType: OutboxOpType, payload: unknown, branchId?: number | null) => {
      await enqueueOp(opType, payload, branchId);
      await refreshPending();
      // Fire-and-forget: if offline this no-ops and the op waits in the outbox.
      void syncNow();
    },
    [refreshPending, syncNow],
  );

  // Connectivity listeners + flush on reconnect.
  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const onOffline = () => setOnline(false);
    const onFocus = () => {
      if (navigator.onLine) void syncNow();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("focus", onFocus);
    };
  }, [syncNow]);

  // Periodic retry while online, and an initial flush on mount (covers ops left
  // queued from a previous session that ended offline).
  useEffect(() => {
    void refreshPending();
    void syncNow();
    timerRef.current = setInterval(() => {
      if (navigator.onLine) void syncNow();
    }, FLUSH_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshPending, syncNow]);

  return (
    <SyncContext.Provider
      value={{
        online,
        pending,
        syncing,
        lastSyncedAt,
        lastDiscrepancies,
        queueWrite,
        syncNow,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = (): SyncContextType => {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return ctx;
};
