import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker only in production
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        // When a new SW takes control (after assets changed), reload once to get fresh bundles
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
        // Check for updates on each load
        registration.update().catch(() => {});
      }).catch(() => {
        // SW registration failed silently
      });
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
