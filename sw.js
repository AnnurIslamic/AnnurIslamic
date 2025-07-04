// Nama cache unik. Ubah nama ini jika Anda memperbarui file statis.
const STATIC_CACHE_NAME = 'annur-islamic-static-v3';
const DYNAMIC_CACHE_NAME = 'annur-islamic-dynamic-v3';

// Aset inti aplikasi (App Shell) yang harus selalu ada.
const APP_SHELL_ASSETS = [
  '/',
  '/index.html', // Simpan sebagai index.html untuk akses root
  // Anda bisa menambahkan path ke file CSS dan JS jika dipisah
  // 'styles/main.css',
  // 'scripts/app.js'
];

// Event 'install': Menyimpan App Shell ke cache saat Service Worker diinstal.
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(cache => {
      console.log('[SW] Precaching App Shell...');
      // Menambahkan semua aset inti ke dalam cache.
      return cache.addAll(APP_SHELL_ASSETS);
    })
  );
});

// Event 'activate': Membersihkan cache lama.
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        // Hapus cache lama yang tidak sesuai dengan nama cache saat ini.
        if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
          console.log('[SW] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Event 'fetch': Menyadap semua permintaan jaringan.
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Strategi Cache-First untuk API Al-Qur'an dan Font Google
  // Jika ada di cache, langsung gunakan. Jika tidak, ambil dari internet dan simpan ke cache.
  if (requestUrl.hostname === 'api.quran.gading.dev' || requestUrl.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(DYNAMIC_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            // Ditemukan di cache, langsung sajikan.
            return response;
          } else {
            // Tidak ada di cache, ambil dari jaringan.
            return fetch(event.request).then(networkResponse => {
              // Simpan respons jaringan ke cache untuk penggunaan offline berikutnya.
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
          }
        });
      })
    );
  } 
  // Strategi Cache-First untuk file statis lainnya (App Shell)
  else {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});
