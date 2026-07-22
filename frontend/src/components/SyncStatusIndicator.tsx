import React from "react";
import StatusDot from "./ui/StatusDot";
import { useSync } from "../context/SyncContext";

/**
 * Compact offline-sync status pill for the app chrome.
 *
 * Shows connectivity and the outbox state so branch staff can trust that a sale
 * recorded offline is safely queued and will upload. States:
 *  - offline               → "Offline" (queued writes will sync on reconnect)
 *  - online, pending > 0   → "Syncing N…" (flush in progress or scheduled)
 *  - online, pending == 0  → "Synced" (+ last-synced time)
 */
function relativeTime(ts: number | null): string {
  if (!ts) return "";
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

export default function SyncStatusIndicator({ className = "" }: { className?: string }) {
  const { online, pending, syncing, lastSyncedAt } = useSync();

  let tone: "operational" | "warning" | "critical" | "idle";
  let label: string;
  let title: string;

  if (!online) {
    tone = "critical";
    label = pending > 0 ? `Offline · ${pending} queued` : "Offline";
    title =
      pending > 0
        ? `No connection. ${pending} change(s) saved locally and will upload when you're back online.`
        : "No connection. Your work is saved locally.";
  } else if (pending > 0 || syncing) {
    tone = "warning";
    label = `Syncing ${pending || ""}`.trim() + "…";
    title = `Uploading ${pending} queued change(s) to the server.`;
  } else {
    tone = "operational";
    const rel = relativeTime(lastSyncedAt);
    label = "Synced";
    title = rel ? `All changes uploaded. Last sync ${rel}.` : "All changes uploaded.";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 ${className}`}
      style={{ background: "var(--surface-2, rgba(0,0,0,0.04))" }}
      title={title}
    >
      <StatusDot tone={tone} label={label} title={title} />
    </span>
  );
}
