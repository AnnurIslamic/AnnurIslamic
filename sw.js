// Nama cache unik. Ubah nomor versi jika Anda memperbarui file statis.
const STATIC_CACHE_NAME = 'annur-islamic-static-v5';
const DYNAMIC_CACHE_NAME = 'annur-islamic-dynamic-v5';

// Aset inti aplikasi (App Shell) yang harus selalu ada untuk penggunaan offline.
// Daftar ini diambil dari gabungan kedua file Anda untuk kelengkapan.
const APP_SHELL_ASSETS = [
    '/',
    'index.html',
    'manifest.json',
    'logo-annur.jpg',
    // Tambahkan path ke file CSS dan JS utama Anda di sini jika ada.
    // Contoh: 'styles/main.css', 'scripts/app.js'
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

// Event 'activate': Membersihkan cache lama agar tidak memakan ruang.
self.addEventListener('activate', event => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                // Hapus semua cache yang tidak sesuai dengan nama cache saat ini.
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

    // Strategi 1: Cache First, then Network untuk API dan Font
    // Ini ideal untuk data yang jarang berubah seperti detail surah atau file font.
    if (requestUrl.hostname === 'api.quran.gading.dev' ||
        requestUrl.hostname === 'fonts.gstatic.com' ||
        requestUrl.hostname === 'fonts.googleapis.com') { // Menambahkan googleapis untuk CSS font
        event.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                return cache.match(event.request).then(cachedResponse => {
                    // Jika respons ada di cache, langsung gunakan.
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Jika tidak, ambil dari jaringan.
                    return fetch(event.request).then(networkResponse => {
                        // Simpan respons jaringan ke cache dinamis untuk penggunaan offline berikutnya.
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
    }
    // Strategi 2: Cache First untuk aset statis lainnya (App Shell)
    else {
        event.respondWith(
            caches.match(event.request).then(response => {
                // Kembalikan dari cache jika ada. Jika tidak ada (misal gambar baru),
                // ambil dari jaringan. Tidak disimpan di cache dinamis karena dianggap statis.
                return response || fetch(event.request);
            })
        );
    }
});
