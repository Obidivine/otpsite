// A minimal service worker to satisfy Chrome's installability check
self.addEventListener('fetch', (event) => {
  // This empty handler is enough for the install prompt to work
});