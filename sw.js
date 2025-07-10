// File: sw.js (Versi Gabungan & Final)

// NAMA CACHE
// Nama cache unik. Ubah nomor versi jika Anda memperbarui file statis.
const STATIC_CACHE_NAME = 'annur-islamic-static-v4';
const DYNAMIC_CACHE_NAME = 'annur-islamic-dynamic-v4';

// ASET INTI APLIKASI (App Shell)
// Aset yang harus selalu ada untuk penggunaan offline.
const APP_SHELL_ASSETS = [
    '/',
    'index.html',
    'manifest.json',
    'logo-annur.jpg',
    // Tambahkan path ke file CSS dan JS utama Anda di sini jika ada.
    // Contoh: 'styles/main.css', 'scripts/app.js'
];

// ==========================================================
// BAGIAN 1: LOGIKA CACHING DAN OFFLINE
// ==========================================================

// Event 'install': Menyimpan App Shell ke cache saat Service Worker diinstal.
self.addEventListener('install', event => {
    console.log('[SW] Menginstal Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then(cache => {
            console.log('[SW] Melakukan pre-caching App Shell...');
            // Menambahkan semua aset inti ke dalam cache.
            return cache.addAll(APP_SHELL_ASSETS);
        })
    );
});

// Event 'activate': Membersihkan cache lama agar tidak memakan ruang.
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

// Event 'fetch': Menyadap semua permintaan jaringan untuk menyediakan fungsionalitas offline.
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // Strategi 1: Cache First, then Network untuk API dan Font.
    // Ini ideal untuk data yang jarang berubah dan bisa digunakan kembali saat offline.
    // API jadwal sholat ditambahkan ke sini.
    if (requestUrl.hostname === 'api.quran.gading.dev' ||
        requestUrl.hostname === 'api.aladhan.com' || // <-- API jadwal sholat ditambahkan
        requestUrl.hostname === 'fonts.gstatic.com' ||
        requestUrl.hostname === 'fonts.googleapis.com') {
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
                // Kembalikan dari cache jika ada. Jika tidak, ambil dari jaringan.
                return response || fetch(event.request);
            })
        );
    }
});


// ==========================================================
// BAGIAN 2: LOGIKA NOTIFIKASI LATAR BELAKANG
// ==========================================================

let scheduledTimeout; // Variabel untuk menyimpan timer agar tidak duplikat

// Event 'message': Menerima data jadwal sholat dari aplikasi utama.
self.addEventListener('message', event => {
    // Pastikan pesan yang diterima adalah untuk menjadwalkan notifikasi
    if (event.data && event.data.type === 'SCHEDULE_PRAYER_NOTIFICATION') {
        const prayerTimes = event.data.payload;

        // Hentikan jadwal notifikasi lama jika ada yang sedang berjalan
        if (scheduledTimeout) {
            clearTimeout(scheduledTimeout);
        }

        // Tentukan jadwal sholat berikutnya yang relevan (tanpa Sunrise dan Imsak)
        const now = new Date();
        const prayerOrderForNotification = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        let nextPrayerName = '';
        let nextPrayerTime = null;

        for (const name of prayerOrderForNotification) {
            // Pastikan prayerTimes[name] ada sebelum membuat tanggal
            if (prayerTimes[name]) {
                const prayerDate = new Date(`${now.toDateString()} ${prayerTimes[name]}`);
                if (prayerDate > now) {
                    nextPrayerTime = prayerDate;
                    nextPrayerName = name;
                    break;
                }
            }
        }

        // Jika tidak ada jadwal berikutnya hari ini, tidak perlu menjadwalkan apa pun.
        // Notifikasi akan dijadwalkan kembali saat pengguna membuka aplikasi keesokan harinya.
        if (!nextPrayerTime) {
            console.log('[SW] Semua jadwal notifikasi untuk hari ini telah lewat.');
            return;
        }

        // Hitung selisih waktu dari sekarang ke waktu sholat berikutnya
        const timeUntilNextPrayer = nextPrayerTime.getTime() - now.getTime();

        console.log(`[SW] Notifikasi untuk ${nextPrayerName} dijadwalkan dalam ${Math.round(timeUntilNextPrayer / 60000)} menit.`);

        // Atur timer untuk menampilkan notifikasi dari Service Worker
        scheduledTimeout = setTimeout(() => {
            self.registration.showNotification(`Waktunya Sholat ${nextPrayerName}`, {
                body: `Segera laksanakan sholat ${nextPrayerName}.`,
                icon: 'logo-annur.jpg', // Pastikan path icon ini benar
                badge: 'logo-annur.jpg', // Icon untuk notifikasi di perangkat mobile
                vibrate: [200, 100, 200] // Pola getaran
            });
        }, timeUntilNextPrayer);
    }
});
