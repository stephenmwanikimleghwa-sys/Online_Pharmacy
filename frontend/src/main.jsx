import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { queryClient } from "./lib/queryClient";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { NotificationProvider } from "./context/NotificationContext";
import App from "./App.jsx";
import { registerServiceWorker } from "./lib/serviceWorker";
import "./index.css";

const persister = createSyncStoragePersister({
  storage: window.sessionStorage,
  key: "TRANSCOUNTY_QUERY_CACHE",
  throttleTime: 1000,
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 30 * 60 * 1000,
  buster: import.meta.env.VITE_APP_VERSION || "1.0.0",
});

window.addEventListener("unhandledrejection", (event) => {
  // intentional log — unhandled promise rejections in production
  console.error("Unhandled rejection:", event.reason);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

document.getElementById("splash")?.remove();

// Register the service worker (production only) for stale-while-revalidate
// caching of API reads, so screens load instantly on slow connections.
registerServiceWorker();
