// Nama cache unik. Ubah nama ini jika Anda memperbarui file aset
// agar service worker menginstal ulang cache dengan file baru.
const CACHE_NAME = 'annur-islamic-cache-v1';

// Daftar aset penting yang akan disimpan saat instalasi.
const URLS_TO_CACHE = [
  // Halaman utama
  '/',
  'index.html',

  // Font dari Google Fonts yang digunakan di CSS
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',

  // Data utama untuk daftar surah Al-Qur'an
  'https://api.quran.gading.dev/surah',
  
  // Ikon yang digunakan untuk notifikasi
  'https://cdn-icons-png.flaticon.com/512/30/30709.png'
];


/**
 * Event 'install': Berjalan saat service worker pertama kali diinstal.
 * Membuka cache dan menyimpan semua aset dari daftar URLS_TO_CACHE.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache dibuka dan file-file aset disimpan.');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(error => {
        console.error('Service Worker: Gagal menyimpan cache saat instalasi.', error);
      })
  );
});


/**
 * Event 'fetch': Berjalan setiap kali halaman meminta sebuah sumber daya (file).
 * Strategi: Cache-First, falling back to Network.
 * Mencoba menyajikan file dari cache terlebih dahulu. Jika tidak ada, baru mengambil dari internet.
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Jika permintaan ada di cache, langsung kembalikan dari cache.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika tidak ada di cache, coba ambil dari network (internet).
        return fetch(event.request).then(
          networkResponse => {
            // Jika berhasil diambil dari network, kita bisa (opsional) menyimpannya ke cache
            // untuk penggunaan di masa depan. Ini berguna untuk data dinamis seperti detail surah.
            return caches.open(CACHE_NAME).then(cache => {
              // Pastikan hanya request GET yang valid yang di-cache
              if (event.request.method === 'GET') {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            });
          }
        ).catch(error => {
          // Gagal mengambil dari cache dan juga dari network.
          // Ini terjadi saat offline dan sumber daya belum pernah di-cache.
          console.error('Service Worker: Gagal mengambil data, baik dari cache maupun network.', error);
          // Anda bisa memberikan response fallback di sini jika perlu,
          // misalnya halaman offline kustom atau gambar placeholder.
        });
      })
  );
});


/**
 * Event 'activate': Berjalan setelah instalasi berhasil dan versi baru service worker aktif.
 * Tugasnya adalah membersihkan cache lama yang tidak lagi digunakan.
 */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          // Hapus semua cache yang namanya tidak sama dengan CACHE_NAME saat ini.
          return cacheName.startsWith('annur-islamic-cache-') && cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Service Worker: Menghapus cache lama:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
  // Memastikan service worker baru langsung mengontrol halaman
  return self.clients.claim();
});