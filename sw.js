// Naikkan versi cache untuk memicu pembaruan
const STATIC_CACHE_NAME = 'annur-islamic-static-v7';
const DYNAMIC_CACHE_NAME = 'annur-islamic-dynamic-v7';

const APP_SHELL_ASSETS = [
    '/AnnurIslamic/',
    '/AnnurIslamic/index.html',
    '/AnnurIslamic/manifest.json',
    '/AnnurIslamic/logo-annur.jpg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            return cache.addAll(APP_SHELL_ASSETS);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// [KODE YANG DIPERBAIKI ADA DI BAWAH INI]
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    const apiHosts = [
        'api.aladhan.com',
        'api.quran.gading.dev',
        'fonts.gstatic.com',
        'fonts.googleapis.com',
        'raw.githubusercontent.com'
    ];

    // [PERBAIKAN] Tambahkan kondisi untuk menangani file audio dan gambar lokal
    // Jika permintaan adalah ke server API ATAU merupakan file audio/gambar,
    // maka simpan ke cache dinamis.
    if (apiHosts.includes(requestUrl.hostname) || event.request.url.endsWith('.mp3') || event.request.url.endsWith('.jpg') || event.request.url.endsWith('.png')) {
        event.respondWith(
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
                return fetch(event.request).then(networkResponse => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                }).catch(() => {
                    // Jika offline, coba ambil dari cache
                    return cache.match(event.request);
                });
            })
        );
    }
    // Jika bukan, ini adalah file inti aplikasi (App Shell).
    else {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});
