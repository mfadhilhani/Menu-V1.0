# Tesfood (Next.js + Google Sheets + Gemini)

Versi Next.js dari situs Tesfood. Data makanan (nama, deskripsi maks. 14 kata, kalori per 100 g) disimpan di Google Sheets dan dibaca/ditulis lewat server. Gemini hanya dipanggil dari server, jadi API key tidak pernah sampai ke browser.

## Cara kerja nama makanan
Saat kamu selesai mengetik nama makanan (pindah kolom atau Enter):
1. **Cocok persis** (tanpa membedakan huruf besar kecil, spasi dan tanda baca dirapikan) → data dari Sheet dipakai, tanpa AI. Kolom diganti dengan penulisan di Sheet.
2. **Mirip** (typo) → muncul pop up "Apakah maksud kamu ini?". **Ya** = pakai data yang ada. **Bukan** = diperlakukan sebagai makanan baru.
3. **Baru** → Gemini mencari nama baku, deskripsi (maks. 14 kata), dan satu angka kkal per 100 g, lalu baris baru ditambahkan ke Sheet dengan `sumber = AI` dan `status = belum dicek`.

Kalau AI gagal (misalnya sedang sibuk), tidak ada baris yang ditulis. Muncul pesan singkat dengan tombol "Coba lagi", dan aplikasi mencoba sekali lagi otomatis setelah beberapa detik. Kamu juga bisa mengisi kalori manual: makanan itu langsung ditambahkan ke Sheet tanpa AI.
Supaya deteksi typo bekerja sejak awal, isi Sheet dengan makanan yang sering dipakai (Riwayat → Impor cadangan lama, atau ketik langsung di Sheet). Sheet kosong berarti semua nama dianggap baru dan lewat AI.
Mengubah kalori di baris Daftar makanan (atau di tab Riwayat) memperbarui Sheet dan menandainya "sudah dicek".

## Struktur Sheet
Tab `makanan` (atau isi `SHEET_TAB`). Baris judul dibuat otomatis:
`key | nama | deskripsi | kkal_100g | sumber | status | diubah | ikon`
Sheet lama yang belum punya kolom `ikon` diperbarui otomatis (baris judul ditambah, data tidak disentuh).

## Menjalankan
```bash
npm install
cp .env.example .env.local   # isi nilainya
npm run dev
```
Untuk mencoba tanpa kredensial: isi `MOCK_BACKEND=1` di `.env.local` (data sementara di memori server, AI berupa contoh). Jangan dipakai di produksi.

## Menyiapkan Google
1. Google Cloud Console: buat project, aktifkan **Google Sheets API**, buat **Service Account**, buat key JSON.
2. Buat Google Sheet, lalu bagikan ke email service account (`client_email`) sebagai **Editor**.
3. `SHEET_ID` = bagian URL Sheet di antara `/d/` dan `/edit`.
4. `GOOGLE_PRIVATE_KEY` = isi `private_key` dari JSON, baris baru ditulis sebagai `\n`.
5. `GEMINI_API_KEY` dari Google AI Studio. Model utama di `GEMINI_MODEL` (bawaan `gemini-3.1-flash-lite`, model ringan yang stabil dan punya tier gratis) dan cadangan di `GEMINI_FALLBACK_MODELS`. Kalau satu model sibuk (503) atau kena batas (429), aplikasi mencoba ulang lalu pindah ke model berikutnya. Cek daftar model terbaru di dokumentasi Gemini; model 2.5 dijadwalkan dimatikan 16 Oktober 2026.

## Deploy ke Vercel
Push ke GitHub, import di Vercel, isi semua variabel dari `.env.example` di Environment Variables, lalu Deploy. Jangan commit `.env.local`.
Catatan: paket Hobby dibatasi untuk pemakaian pribadi nonkomersial; cek ketentuan terbaru di vercel.com.

## Keamanan
- Semua route `/api/*` (kecuali login) butuh login PIN (`APP_PIN`, cookie `httpOnly` bertanda tangan memakai `AUTH_SECRET`). Isi `AUTH_SECRET` dengan teks acak panjang.
- Batas panggilan AI per hari (`AI_DAILY_LIMIT`) dihitung di memori tiap instance server, jadi hanya pembatas kasar. Pasang juga batas biaya/kuota di Google AI Studio.
- Kuota Google Sheets: 300 baca/menit per project dan 60/menit per pengguna; akun layanan dihitung satu pengguna. Karena itu isi Sheet di-cache 60 detik di server.

## Info umum
- **Jenis menu**: pilih dari daftar (Reguler, Tematik, BBQ, Healthy Food) atau ketik sendiri; yang kamu ketik diingat di daftar.
- **Live Cooking**: centang, lalu isi menu yang live. Baris `👩‍🍳 Live Cooking : …` muncul di laporan kalori, dan `*Live Cooking : …*` di laporan Test Food (di antara judul dan tanggal).
- **Waktu makan otomatis** mengikuti jam: Breakfast 03.00-08.59, Lunch 09.00-13.59, Dinner 14.00-17.59, Supper 18.00-02.59. Memilih sendiri mematikan otomatis; centang lagi untuk kembali ke jam.
- Nama makanan otomatis ditulis **Capitalize Each Word** (singkatan 1-3 huruf besar seperti BBQ tetap).

## Pukul (Test Food)
Di tab Test Food, centang "Tampilkan Pukul" untuk menambah baris `*Pukul : 10.34 WITA*` tepat di bawah tanggal. Jam terisi dari jam sekarang saat dicentang dan bisa diubah; zona waktu WIB/WITA/WIT bisa dipilih (bawaan WITA). Hanya berlaku di laporan Test Food.

## Ikon makanan
Ikon di daftar makanan dipilih otomatis dari nama (lebih dari 100 kata kunci; jenis hidangan didahulukan atas bahan, mis. "Mie Ayam" = 🍜). Ketuk ikon untuk memilih sendiri dari kisi emoji atau mengetik emoji; pilihan itu disimpan di kolom `ikon` Sheet dan dipakai lagi saat nama yang sama diketik. Bisa juga diubah di tab Riwayat.

## Poster dan kolase
Semua fitur poster dan kolase dari versi HTML sudah ada:
- **Poster menu** (tab Menu & Kalori, untuk Breakfast dan Dinner): form 4 menu (Breakfast, template Kantin BCP) atau 6 menu (Dinner, dengan deskripsi). Nama, kalori, dan deskripsi terisi dari Sheet. Foto disimpan di browser (IndexedDB), jadi tidak hilang saat reload. Geser ⠿ untuk memindah urutan; foto ikut pindah.
- **Poster kode warna (kolase)**: satu kartu landscape per menu (foto, kalori, nama, kartu kode warna), dua ke samping lalu ke bawah.
- **Kode warna makanan**: kartu per baris Daftar makanan, unduh satu per satu atau semua jadi satu gambar.
- **Foto untuk laporan kalori** dan **Kolase foto Test Food**: unggah foto, kolase otomatis, unduh atau kirim ke WhatsApp bersama teks.
- **Mulai baru** menghapus isian dan foto di browser ini (data di Sheet tidak tersentuh).

Catatan:
- Gambar template ada di `public/assets/` (poster Breakfast dan Dinner, kartu landscape, logo, wajah kartu). Ganti file dengan nama yang sama untuk mengubah desain.
- Font poster (Gaegu, Playfair Display SC, Hanken Grotesk) dimuat dari Google Fonts; kalau gagal dimuat dipakai font cadangan.
- Kirim gambar + teks lewat menu bagikan HP butuh HTTPS dan browser yang mendukung. Kalau tidak didukung, gambar disimpan dan teks disalin.
- Lunch dan Supper tidak punya poster, hanya laporan teks.

## Biaya Gemini
Menurut halaman harga Gemini (dicek 15 Oktober 2026), model ringan seperti `gemini-3.1-flash-lite` dan `gemini-3.5-flash-lite` punya **tier gratis** untuk input dan output. Batas per menit/hari bergantung model dan hanya terlihat di Google AI Studio (halaman Rate limit); batas itu tidak dijamin. Di tier gratis, isi permintaan boleh dipakai Google untuk meningkatkan produknya, jadi jangan kirim data sensitif (nama makanan aman). Tier berbayar baru berlaku kalau kamu menautkan akun penagihan di AI Studio. Satu pencarian makanan baru memakai sekitar ratusan token, jadi kalau suatu saat berbayar pun biayanya sangat kecil.
