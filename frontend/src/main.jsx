import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { SyncProvider } from "./context/SyncContext";
import App from "./App.jsx";
import "./index.css";

// Prefer light shell until ThemeProvider runs
document.documentElement.classList.add("light");

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled rejection:", event.reason);
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <SyncProvider>
                <App />
              </SyncProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

// Drop splash after React has committed real content (double rAF ≈ after paint).
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.getElementById("splash")?.remove();
  });
});

// Persist query cache after first paint so large localStorage restores don't stall landing.
const schedulePersist = (fn) => {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(fn, { timeout: 3000 });
  } else {
    window.setTimeout(fn, 500);
  }
};

schedulePersist(() => {
  try {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: "TRANSCOUNTY_QUERY_CACHE",
      throttleTime: 1000,
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: 30 * 60 * 1000,
      buster: import.meta.env.VITE_APP_VERSION || "1.0.1",
    });
  } catch (err) {
    console.warn("[query-persist] skipped:", err);
    try {
      localStorage.removeItem("TRANSCOUNTY_QUERY_CACHE");
    } catch {
      /* ignore */
    }
  }
});

// Service worker intentionally not registered — it previously cached broken
// SPA shells and competed with first paint. Offline queue uses IndexedDB instead.
