/**
 * Resolve API base URL for dev and production (including Render split deploy).
 */
const DEFAULT_DEV_URL = "http://localhost:8000/api";

/** Frontend host -> backend API when VITE_* env vars were not set at build time. */
const RENDER_FRONTEND_TO_API: Record<string, string> = {
  "online-pharmacy-1-np3y.onrender.com": "https://online-pharmacy-sn88.onrender.com/api",
};

export function resolveApiBaseUrl(): string {
  const fromEnv = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  if (fromEnv) return fromEnv;

  if (import.meta.env.DEV) {
    return DEFAULT_DEV_URL;
  }

  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const paired = host ? RENDER_FRONTEND_TO_API[host] : "";
  if (paired) {
    return paired.replace(/\/$/, "");
  }

  const sameOrigin =
    typeof window !== "undefined" ? `${window.location.origin}/api` : "/api";
  return sameOrigin.replace(/\/$/, "");
}
