/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { flushOutbox } from "../lib/syncEngine";
import {
  countFailed,
  countPending,
  enqueueOp,
  type EnqueueOptions,
  type OutboxOpType,
} from "../lib/offlineDb";

interface SyncContextType {
  /** Browser connectivity. */
  online: boolean;
  /** Ops queued locally and not yet acknowledged by the server. */
  pending: number;
  /** Ops that failed repeatedly and need staff attention. */
  failed: number;
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
    branchId?: number | null | EnqueueOptions,
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
  const [failed, setFailed] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [lastDiscrepancies, setLastDiscrepancies] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshPending = useCallback(async () => {
    try {
      setPending(await countPending());
      setFailed(await countFailed());
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
    async (
      opType: OutboxOpType,
      payload: unknown,
      branchId?: number | null | EnqueueOptions,
    ) => {
      await enqueueOp(opType, payload, branchId);
      await refreshPending();
      // Fire-and-forget: if offline this no-ops and the op waits in the outbox.
      void syncNow();
    },
    [refreshPending, syncNow],
  );

  // Connectivity listeners + flush on reconnect (not on every focus while idle).
  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      void syncNow();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncNow]);

  // Defer initial flush so landing/first paint aren't competing with IndexedDB + API.
  useEffect(() => {
    void refreshPending();
    const bootTimer = window.setTimeout(() => {
      if (navigator.onLine) void syncNow();
    }, 2500);
    timerRef.current = setInterval(() => {
      if (navigator.onLine) void syncNow();
    }, FLUSH_INTERVAL_MS);
    return () => {
      window.clearTimeout(bootTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshPending, syncNow]);

  return (
    <SyncContext.Provider
      value={{
        online,
        pending,
        failed,
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
