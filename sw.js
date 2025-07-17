// Nama cache yang unik. Ubah nomor versi jika Anda memperbarui file inti aplikasi.
const STATIC_CACHE_NAME = 'annur-islamic-static-v6';
const DYNAMIC_CACHE_NAME = 'annur-islamic-dynamic-v6';

// Aset inti aplikasi (App Shell) yang harus selalu ada.
// [PERBAIKAN] Path file disesuaikan untuk GitHub Pages.
const APP_SHELL_ASSETS = [
    '/AnnurIslamic/',
    '/AnnurIslamic/index.html',
    '/AnnurIslamic/manifest.json',
    '/AnnurIslamic/logo-annur.jpg',
    // Jika punya file CSS atau JS sendiri, tambahkan di sini. Contoh:
    // '/AnnurIslamic/assets/style.css',
    // '/AnnurIslamic/assets/app.js'
];

// Event 'install': Menyimpan App Shell ke cache statis.
self.addEventListener('install', event => {
    console.log('[SW] Menginstall Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('[SW] Menyimpan App Shell ke cache...');
            return cache.addAll(APP_SHELL_ASSETS);
        })
    );
});

// Event 'activate': Membersihkan cache lama agar tidak menumpuk.
self.addEventListener('activate', event => {
    console.log('[SW] Mengaktifkan Service Worker...');
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                // Hapus semua cache yang tidak sesuai dengan nama cache saat ini.
                if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    console.log('[SW] Menghapus cache lama:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// Event 'fetch': Menyadap permintaan jaringan dan menerapkan strategi caching.
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Strategi untuk API (Jadwal Sholat, Al-Qur'an) dan Font Web.
    // Data ini akan disimpan di cache dinamis.
    const apiHosts = [
        'api.aladhan.com', // [TAMBAHAN] API Jadwal Sholat
        'api.quran.gading.dev',
        'fonts.gstatic.com',
        'fonts.googleapis.com',
        'raw.githubusercontent.com' // [TAMBAHAN] Untuk file audio adzan
    ];

    if (apiHosts.includes(requestUrl.hostname)) {
        event.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                // 1. Coba ambil dari jaringan dulu untuk data terbaru (Network First)
                return fetch(event.request).then(networkResponse => {
                    // Jika berhasil, simpan ke cache dinamis dan kembalikan
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    // 2. Jika gagal (offline), coba cari di cache
                    return cache.match(event.request).then(cachedResponse => {
                        // Kembalikan dari cache jika ada
                        return cachedResponse;
                    });
                });
            })
        );
    }
    // Strategi untuk aset inti aplikasi (Cache First)
    else {
        event.respondWith(
            caches.match(event.request).then(response => {
                // Kembalikan dari cache jika ada, jika tidak, ambil dari jaringan.
                return response || fetch(event.request);
            })
        );
    }
});
