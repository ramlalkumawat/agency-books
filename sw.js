/**
 * AgencyBooks - Service Worker for Offline PWA Support
 */

const CACHE_NAME = 'agencybooks-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/document-preview.css',
  './js/db.js',
  './js/utils.js',
  './js/state.js',
  './js/pdf.js',
  './js/views/dashboard.js',
  './js/views/companies.js',
  './js/views/clients.js',
  './js/views/proposals.js',
  './js/views/quotations.js',
  './js/views/invoices.js',
  './js/views/payments.js',
  './js/views/documents.js',
  './js/views/reports.js',
  './js/views/settings.js',
  './js/views/backup.js',
  './js/app.js',
  './assets/icon-192.svg',
  './assets/icon-512.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Stale-while-revalidate strategy for local app assets
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
