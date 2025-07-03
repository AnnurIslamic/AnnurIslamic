// PENTING: Versi cache dinaikkan menjadi v3 untuk memaksa update!
const CACHE_NAME = 'annur-islamic-cache-v3';

// Daftar aset "kerangka" aplikasi yang akan disimpan di awal.
const URLS_TO_PRECACHE = [
  '/',
  'index.html',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdn-icons-png.flaticon.com/512/30/30709.png'
];

// Event 'install': Menyimpan kerangka aplikasi.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Pre-caching kerangka aplikasi.');
        return cache.addAll(URLS_TO_PRECACHE);
      })
  );
});

// Event 'activate': Membersihkan cache lama.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('annur-islamic-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Service Worker: Menghapus cache lama:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  return self.clients.claim();
});

// Event 'fetch': Strategi Network-First yang disempurnakan.
self.addEventListener('fetch', event => {
  // Kita hanya terapkan strategi ini untuk request navigasi dan API
  if (event.request.mode === 'navigate' || event.request.url.includes('api.')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Periksa apakah response dari network valid sebelum di-cache
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Jika network gagal, baru ambil dari cache
          console.log('Service Worker: Network gagal, mengambil dari cache untuk:', event.request.url);
          return caches.match(event.request);
        })
    );
  } else {
    // Untuk aset lain (seperti font), gunakan strategi Cache-First
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});
