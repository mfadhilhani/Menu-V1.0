# Tesfood (Next.js + Google Sheets + Gemini)

Versi Next.js dari situs Tesfood. Data makanan (nama, deskripsi maks. 14 kata, kalori per 100 g) disimpan di Google Sheets dan dibaca/ditulis lewat server. Gemini hanya dipanggil dari server, jadi API key tidak pernah sampai ke browser.

## Cara kerja nama makanan
Saat kamu selesai mengetik nama makanan (pindah kolom atau Enter):
1. **Cocok persis** (tanpa membedakan huruf besar kecil, spasi dan tanda baca dirapikan) → data dari Sheet dipakai, tanpa AI. Kolom diganti dengan penulisan di Sheet.
2. **Mirip** (typo) → muncul pop up "Apakah maksud kamu ini?". **Ya** = pakai data yang ada. **Bukan** = diperlakukan sebagai makanan baru.
3. **Baru** → Gemini mencari nama baku, deskripsi (maks. 14 kata), dan satu angka kkal per 100 g, lalu baris baru ditambahkan ke Sheet dengan `sumber = AI` dan `status = belum dicek`.

Kalau AI gagal, tidak ada baris yang ditulis; kolom tetap bisa dipakai dan dicoba lagi saat kamu mengetik ulang.
Mengubah kalori di baris Daftar makanan (atau di tab Riwayat) memperbarui Sheet dan menandainya "sudah dicek".

## Struktur Sheet
Tab `makanan` (atau isi `SHEET_TAB`). Baris judul dibuat otomatis:
`key | nama | deskripsi | kkal_100g | sumber | status | diubah`

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
5. `GEMINI_API_KEY` dari Google AI Studio. Nama model di `GEMINI_MODEL`; ganti kalau modelnya tidak tersedia untuk key kamu.

## Deploy ke Vercel
Push ke GitHub, import di Vercel, isi semua variabel dari `.env.example` di Environment Variables, lalu Deploy. Jangan commit `.env.local`.
Catatan: paket Hobby dibatasi untuk pemakaian pribadi nonkomersial; cek ketentuan terbaru di vercel.com.

## Keamanan
- Semua route `/api/*` (kecuali login) butuh login PIN (`APP_PIN`, cookie `httpOnly` bertanda tangan memakai `AUTH_SECRET`). Isi `AUTH_SECRET` dengan teks acak panjang.
- Batas panggilan AI per hari (`AI_DAILY_LIMIT`) dihitung di memori tiap instance server, jadi hanya pembatas kasar. Pasang juga batas biaya/kuota di Google AI Studio.
- Kuota Google Sheets: 300 baca/menit per project dan 60/menit per pengguna; akun layanan dihitung satu pengguna. Karena itu isi Sheet di-cache 60 detik di server.

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
