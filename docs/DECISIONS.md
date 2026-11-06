# Catatan keputusan (ADR)

Setiap keputusan: konteks, keputusan, akibat. Keputusan D1–D8 berasal dari dokumen audit V2.0 (6 November 2026).

## ADR-001 — PIN per site (D1)
**Konteks.** V1 memakai satu `APP_PIN`, jadi server tidak tahu site siapa yang meminta data. Isolasi site di server mustahil tanpa identitas site di sesi.
**Keputusan.** Tiap site punya PIN sendiri (`SITE_PINS` untuk BCP/DPS/Kintap, `SITE_CUSTOM` untuk site lain). Token login membawa `siteId` dan versi kunci yang diturunkan dari PIN site. Site custom hanya bisa ditemukan lewat nama yang diketik, tidak didaftar di layar login.
**Akibat.** Isolasi data benar-benar di server. Mengganti PIN satu site mencabut login site itu saja. Site custom baru butuh perubahan env dan restart/redeploy (belum ada halaman admin).

## ADR-002 — Katalog makanan tetap bersama (D2, sementara)
**Konteks.** Tab `makanan` berisi nama, kkal, deskripsi, dan ikon. Kalori makanan sama di semua site.
**Keputusan.** Katalog tetap satu untuk semua site, sama dengan perilaku V1. Dipakai sementara karena mudah dibalik.
**Akibat.** Perubahan kkal atau ikon dari satu site terlihat di site lain. Bila nanti perlu dipisah, tambahkan kolom `site` dan filter dari cookie.

## ADR-003 — Template gambar bersih dari desainer (D3)
**Konteks.** Tulisan "Kantin BCP"/"Site BCP" dan logo DH tertanam di 5 file template (`public/assets`). Badge "Site BCP" poster Dinner digambar di atas bercak oranye, jadi tidak bisa ditutup rapi lewat canvas.
**Keputusan.** Desainer menyiapkan versi template tanpa tulisan BCP dan tanpa logo DH; aplikasi menulis nama site dan memasang logo.
**Akibat.** Sampai file itu ada, DPS, Kintap, dan site custom masih memakai gambar BCP; aplikasi menampilkan peringatan. Teks laporan dan sampul video sudah memakai nama site yang benar.

## ADR-004 — Keterangan nilai Test Food per baris (D5)
**Keputusan.** Format baru menulis keterangan per baris: `Ket:` lalu `5 : Baik Sekali` sampai `1 : Sangat Kurang`.
**Masih terbuka.** Tanda tebal WhatsApp `*…*`, ejaan hari ("Jumat"/"Jum’at"), dan apakah baris Pukul/Live Cooking/Snack/Buah ikut di format baru.

## ADR-005 — Satu tab draf per site, BCP tetap di tab lama
**Konteks.** V1 menyimpan draf di baris 2 tab `draf`. Pilihannya: satu tab per site, atau satu baris per site di tab baru.
**Keputusan.** Tab per site. BCP memakai tab `draf` apa adanya; site lain `draf_<id>`, dibuat otomatis.
**Akibat.** Tanpa migrasi data. Versi lama dan baru bisa berjalan bersamaan untuk BCP (bentuk draf belum berubah di Tahap 1). Kode baca/tulis draf hampir tidak berubah. Saat bentuk draf berubah (Tahap 2, skema v2), versi baru akan menulis ke tab baru supaya versi lama tidak rusak.

## ADR-006 — Runner uji bawaan Node, tanpa paket baru
**Konteks.** Repo belum punya uji. Instal paket tidak selalu tersedia (sandbox, VPS tanpa internet).
**Keputusan.** `node:test` + fitur TypeScript bawaan Node 22, dengan loader kecil (`tests/hooks.mjs`) untuk alias `@/` dan impor tanpa ekstensi. Bila paket `next` belum terpasang, `next/server` diganti stub kecil (`tests/stubs/next-server.ts`); di CI paket aslinya yang dipakai.
**Akibat.** `npm test` jalan tanpa `npm install` tambahan. Komponen `.tsx` tidak diuji unit; perilakunya diuji lewat uji browser (`tests/e2e/site.e2e.mjs`).

## ADR-007 — Batas PIN hanya menghitung percobaan gagal
**Konteks.** V1 menghitung semua percobaan login per IP (10 per 10 menit). Semua HP di satu Wi-Fi site biasanya keluar lewat satu IP publik; saat rilis semua orang login ulang.
**Keputusan.** Hanya PIN salah yang dihitung. IP dari `X-Real-IP` (diisi proxy), lalu entri terakhir `X-Forwarded-For`.
**Akibat.** Pengguna yang PIN-nya benar tidak terkunci. Penebakan PIN tetap dibatasi 10 kali per 10 menit per IP. Batas masih per instance server (di Vercel bisa beberapa instance).
