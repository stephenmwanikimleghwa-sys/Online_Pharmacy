/**
 * Service worker registration + cache control.
 *
 * The SW (public/sw.js) provides a stale-while-revalidate cache for GET /api/
 * reads so screens paint instantly on slow/high-latency connections. It is only
 * registered in production builds — in dev it would cache Vite's HMR assets and
 * cause confusing stale reloads.
 */

let registration: ServiceWorkerRegistration | null = null;

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  if (!import.meta.env.PROD) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;
      })
      .catch((err) => {
        // Registration failure is non-fatal; the app still works online.
        console.warn("[SW] registration failed:", err);
      });
  });
}

/**
 * Purge cached API reads. Call this on logout so the next user on a shared
 * pharmacy machine cannot see the previous user's cached data.
 */
export function clearApiCache(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  const target = registration?.active ?? navigator.serviceWorker.controller;
  target?.postMessage({ type: "CLEAR_API_CACHE" });
}
