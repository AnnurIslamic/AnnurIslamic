// PENTING: Ubah versi cache agar browser menginstal ulang service worker
const CACHE_NAME = 'annur-islamic-cache-v2';

// Daftar aset penting yang akan disimpan saat instalasi (kerangka aplikasi).
const URLS_TO_PRECACHE = [
  '/',
  'index.html',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  'https://cdn-icons-png.flaticon.com/512/30/30709.png'
  // Kita tidak memasukkan API di sini agar ditangani oleh event 'fetch'
];

/**
 * Event 'install': Tetap sama, menyimpan kerangka aplikasi.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Pre-caching kerangka aplikasi.');
        return cache.addAll(URLS_TO_PRECACHE);
      })
  );
});

/**
 * Event 'activate': Tetap sama, membersihkan cache lama.
 */
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

/**
 * Event 'fetch': INI BAGIAN YANG DIUBAH TOTAL.
 * Menerapkan strategi "Network-First, falling back to Cache".
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    // 1. Coba ambil dari network terlebih dahulu
    fetch(event.request)
      .then(networkResponse => {
        // 2. Jika berhasil, simpan salinannya ke cache untuk nanti
        return caches.open(CACHE_NAME).then(cache => {
          // Pastikan hanya request GET yang valid yang di-cache
          if (event.request.method === 'GET') {
            cache.put(event.request, networkResponse.clone());
          }
          // Dan kembalikan response dari network
          return networkResponse;
        });
      })
      .catch(() => {
        // 3. Jika network gagal (offline), coba ambil dari cache
        console.log('Service Worker: Network gagal, mencoba mengambil dari cache untuk:', event.request.url);
        return caches.match(event.request);
      })
  );
});
