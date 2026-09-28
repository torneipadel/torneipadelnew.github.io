const CACHE_NAME = "next-point-padel-pwa-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Il Service Worker non deve intercettare richieste applicative.
// In particolare non deve toccare richieste Supabase cross-origin.
// Lasciamo quindi il fetch completamente alla rete/browser.
