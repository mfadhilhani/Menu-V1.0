# Pengujian

## Menjalankan
```bash
npm test                 # semua uji unit dan integrasi API (Node 22, tanpa kredensial, mode MOCK)
npm run typecheck        # butuh npm install
npm run build            # butuh npm install
```
Uji browser (butuh paket `playwright` dan Chromium, di luar dependensi proyek):
```bash
MOCK_BACKEND=1 AUTH_SECRET=$(openssl rand -hex 32) \
SITE_PINS='{"bcp":"1111","dps":"2222"}' SITE_CUSTOM='[{"nama":"Site Tambang ABC","pin":"3333"}]' npm run dev
BASE_URL=http://localhost:3000 node tests/e2e/site.e2e.mjs
```
Uji tidak pernah menyentuh Google Sheets produksi: semua memakai `MOCK_BACKEND=1` (data di memori server).

## Isi uji
| File | Yang diuji |
| --- | --- |
| `tests/text.test.ts` | Kapitalisasi, normalisasi, typo, ikon, batas jam waktu makan, hari kerja 03.00 |
| `tests/report.test.ts` | Teks laporan Test Food, kalori, kode warna (dikunci persis), label site |
| `tests/pattern.test.ts` | Pola daftar dan id baris tetap |
| `tests/store.test.ts` | Katalog makanan (tambah, ubah, hapus) |
| `tests/site.test.ts` | Daftar site, label, konfigurasi `SITE_PINS`/`SITE_CUSTOM`, konfigurasi rusak ditolak |
| `tests/token.test.ts` | Token per site, tanda tangan, ganti PIN, kedaluwarsa, token V1, `AUTH_SECRET` produksi |
| `tests/api-site.test.ts` | Route `/api/auth`, `/api/auth/logout`, `/api/draft`, `/api/foods`: login per site, isolasi draf, 409 tab lama, 401 tanpa/palsu cookie, batas PIN |
| `tests/idb-scope.test.ts` | Kunci foto per site, Mulai baru hanya menghapus foto site aktif |
| `tests/video.test.ts` | Argumen ffmpeg; render MP4 nyata bila ffmpeg ada |
| `tests/e2e/site.e2e.mjs` | Browser: login per site, sinkron dua perangkat satu site, isolasi DPS, site custom, PIN salah, dua tab satu browser, Mulai baru, lebar 360 px |

## Hasil terakhir (6 November 2026, sandbox Linux, Node 22.23, ffmpeg 6.1)
| Uji | Status | Catatan |
| --- | --- | --- |
| `npm test` | PASS | 50/50. Route diuji dengan stub `next/server` karena paket `next` tidak terpasang di sandbox. |
| Uji browser | PASS | 20/20, dua kali berturut-turut. Komponen React dan route API asli, dibundel esbuild dan dilayani server Node kecil, bukan `next dev`. Geser-urut (@dnd-kit) diganti stub, jadi tidak ikut diuji. Pesan console yang muncul hanya 401 (skenario PIN salah) dan 409 (skenario tab lama), keduanya memang diharapkan. |
| Cek tipe | PASS sebagian | `tsc` dengan deklarasi pengganti untuk React/Next (tidak terpasang). Tidak ada error selain tipe parameter event yang memang datang dari `@types/react`. |
| `npm ci`, `npm run build`, `npm run typecheck` | BLOCKED | Instal paket nonaktif di sandbox; lockfile juga belum sinkron (B5). Harus jalan di CI setelah lockfile diperbaiki. |
| Android/iPhone fisik, Safari/WebKit | NOT TESTED | Uji browser memakai Chromium dengan emulasi iPhone 13 dan lebar 360 px. |
