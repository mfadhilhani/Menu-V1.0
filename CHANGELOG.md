# Changelog

Format: tanggal, tahap, lalu perubahan. Versi sebelum V2.0 dicatat di README (Pembaruan 1–3).

## [Belum dirilis] V2.0 — cabang `feature/menu-v2-development`

### Tahap 1 — Identitas site dan akses (6 November 2026)
**Ditambahkan**
- Login per site: BCP, DPS, Kintap Project (yang punya PIN di `SITE_PINS`) dan site custom (`SITE_CUSTOM`, dipilih lewat "Lainnya" + nama site).
- `src/lib/site.ts`: satu sumber identitas site (nama, kode site laporan bawaan, camp bawaan, label "Site …").
- `src/lib/token.ts`: token login berisi site + versi kunci dari PIN site.
- `POST /api/auth/logout` dan tombol **Ganti site** di Info umum.
- Header `X-Site` pada `/api/draft`; tab yang masih membuka site lain mendapat 409 dan dimuat ulang.
- Peringatan di bagian Poster untuk site selain BCP bahwa template gambar masih BCP.

**Diubah**
- `/api/draft`: site diambil dari cookie. BCP tetap tab `draf`, site lain tab `draf_<id>`.
- Draf `localStorage` dan foto IndexedDB dipisah per site (BCP memakai kunci lama).
- `GET /api/auth` mengembalikan site aktif dan daftar site standar yang aktif; `POST /api/auth` menerima `{site, nama?, pin}` (klien lama `{pin}` = BCP).
- Batas PIN: hanya percobaan gagal yang dihitung; IP dari `X-Real-IP`, lalu entri terakhir `X-Forwarded-For`.
- `AUTH_SECRET` wajib di produksi (gagal tertutup).

**Diperbaiki**
- B3: laporan kalori site lain berjudul "DH BCP".
- B4: Mulai baru mengembalikan site ke BCP.
- B9: "Site Site …" di laporan dan sampul video untuk nama berawalan "Site".
- B10: "Site -" untuk site custom tanpa nama.

**Diperbaiki dari review kode independen**
- Batas PIN bisa dilewati dengan banyak tebakan yang dikirim bersamaan (batas dicek sebelum isi permintaan dibaca). Sekarang dicek setelahnya.
- Permintaan draf tanpa `X-Site` (tab versi lama) diterima untuk site mana pun. Sekarang dianggap BCP.
- Token V1 tetap berlaku setelah PIN BCP diganti. Sekarang hanya berlaku selama PIN BCP sama dengan `APP_PIN`.
- Id site custom bisa memuat huruf non-ASCII yang membuat header `X-Site` gagal dikirim (sinkron macet). Id sekarang ASCII saja.
- Detail kesalahan konfigurasi (bisa memuat nama site custom) terlihat oleh orang yang belum login. Sekarang hanya di log server.
- Draf V1 dengan "Lainnya…" + nama ketikan berubah diam-diam menjadi "Site BCP". Sekarang ada pemberitahuan.
- Peta batas PIN bisa tumbuh tanpa batas; dua perangkat membuka site baru bersamaan bisa gagal membuat tab draf; layar login mereset pilihan site saat kembali ke tab.

**Kompatibilitas**
- Pengguna BCP: `APP_PIN` dan cookie lama tetap berlaku; tab `draf`, kunci `tfm2_draft`, dan foto lama tetap dipakai; teks laporan BCP tidak berubah (dikunci uji karakterisasi).
- Versi lama aplikasi yang masih terbuka di perangkat BCP tetap bisa menyimpan ke tab `draf`.

### Tahap 0 — Fondasi (6 November 2026)
- Runner uji tanpa paket tambahan (`node:test` + loader `tests/hooks.mjs`), uji karakterisasi untuk `text`, `report`, `pattern`, `store`, `video`.
- GitHub Actions: `npm ci`, `npm test`, `npm run build`, `npm run typecheck`.
- `sheets.ts` memuat `google-auth-library` saat dipakai saja (tanpa perubahan perilaku).

### Diketahui belum beres
- `package-lock.json` belum memuat `ffmpeg-static` (B5): jalankan `npm install` dan commit lockfile sebelum CI/VPS.
- Template poster, kartu, sampul, dan penutup video untuk DPS, Kintap, dan site custom masih bergambar BCP + logo DH (menunggu template dari desainer).
- Belum dikerjakan: upload logo, mode lokal/cloud, versi draf di server dan gabung tiga arah (B1, B2, B6, B7), Info umum per waktu makan, Test Food format baru, ikon (B8), UI/UX mobile, video 9:16, panduan VPS.
