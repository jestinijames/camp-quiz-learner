// filepath: c:\Users\Jestin lssac James\OneDrive\Documents\Github\camp-quiz-learner\public\sw.js
const CACHE_NAME = 'camp-quiz-v1';
const urlsToCache = [
  '/',
  '/login',
  '/admin/dashboard',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});