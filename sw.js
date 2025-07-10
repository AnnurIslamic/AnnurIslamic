// File: sw.js (Versi Perbaikan yang Lebih Andal)

// NAMA CACHE
const STATIC_CACHE_NAME = 'annur-islamic-static-v5'; // Versi dinaikkan untuk memicu update
const DYNAMIC_CACHE_NAME = 'annur-islamic-dynamic-v5';

// ASET INTI APLIKASI (App Shell)
// Kita hanya akan pre-cache file yang 100% pasti ada.
// Aset lain seperti logo dan manifest akan di-cache secara dinamis saat diakses.
const APP_SHELL_ASSETS = [
    '/',
    'index.html'
];

// ==========================================================
// BAGIAN 1: LOGIKA CACHING DAN OFFLINE
// ==========================================================

// Event 'install': Menyimpan App Shell ke cache.
self.addEventListener('install', event => {
    console.log('[SW] Menginstal Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('[SW] Melakukan pre-caching App Shell...');
            // Hanya cache file inti, mengurangi risiko gagal
            return cache.addAll(APP_SHELL_ASSETS);
        })
    );
});

// Event 'activate': Membersihkan cache lama.
self.addEventListener('activate', event => {
    console.log('[SW] Mengaktifkan Service Worker...');
    event.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
                if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
                    console.log('[SW] Menghapus cache lama:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// Event 'fetch': Menyadap semua permintaan jaringan.
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Jika request ada di cache, langsung kembalikan dari cache
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Jika tidak ada di cache, ambil dari jaringan
                return fetch(event.request)
                    .then(networkResponse => {
                        // Buka cache dinamis untuk menyimpan request baru ini
                        return caches.open(DYNAMIC_CACHE_NAME)
                            .then(cache => {
                                // Simpan salinan respons ke cache untuk penggunaan offline berikutnya
                                // Ini akan otomatis meng-cache logo, manifest, font, dan panggilan API saat pertama kali diakses
                                cache.put(event.request.url, networkResponse.clone());
                                // Kembalikan respons asli ke aplikasi
                                return networkResponse;
                            });
                    });
            })
            .catch(error => {
                // Ini adalah bagian fallback jika jaringan dan cache gagal
                console.error('[SW] Gagal mengambil data:', error);
                // Anda bisa menambahkan halaman offline fallback di sini jika mau
                // return caches.match('/offline.html');
            })
    );
});


// ==========================================================
// BAGIAN 2: LOGIKA NOTIFIKASI LATAR BELAKANG
// ==========================================================

let scheduledTimeout;

// Event 'message': Menerima data jadwal sholat dari aplikasi utama.
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SCHEDULE_PRAYER_NOTIFICATION') {
        const prayerTimes = event.data.payload;

        if (scheduledTimeout) {
            clearTimeout(scheduledTimeout);
        }

        const now = new Date();
        const prayerOrderForNotification = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        let nextPrayerName = '';
        let nextPrayerTime = null;

        for (const name of prayerOrderForNotification) {
            if (prayerTimes[name]) {
                const prayerDate = new Date(`${now.toDateString()} ${prayerTimes[name]}`);
                if (prayerDate > now) {
                    nextPrayerTime = prayerDate;
                    nextPrayerName = name;
                    break;
                }
            }
        }

        if (!nextPrayerTime) {
            console.log('[SW] Semua jadwal notifikasi untuk hari ini telah lewat.');
            return;
        }

        const timeUntilNextPrayer = nextPrayerTime.getTime() - now.getTime();

        console.log(`[SW] Notifikasi untuk ${nextPrayerName} dijadwalkan dalam ${Math.round(timeUntilNextPrayer / 60000)} menit.`);

        scheduledTimeout = setTimeout(() => {
            self.registration.showNotification(`Waktunya Sholat ${nextPrayerName}`, {
                body: `Segera laksanakan sholat ${nextPrayerName}.`,
                icon: 'logo-annur.jpg',
                badge: 'logo-annur.jpg',
                vibrate: [200, 100, 200]
            });
        }, timeUntilNextPrayer);
    }
});
