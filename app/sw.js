// Lưu sẵn giao diện app để mở được khi không có mạng (trên xe). File MP3 nằm trong IndexedDB, không qua đây.
const CACHE = 'hoc-kich-ban-v3';
const FILES = ['./', './index.html', './lesson-player.js', './timestamp-script-parser.js', './silence-segmenter.js', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

// Có mạng thì lấy bản mới (để cập nhật app và bài), mất mạng thì dùng bản đã lưu.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok) return response;
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true })),
  );
});
