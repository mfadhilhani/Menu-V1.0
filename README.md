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

## Belum dipindahkan dari versi HTML
Poster Breakfast/Dinner, kartu dan kolase kode warna, serta kolase foto Test Food. Laporan teks, riwayat, daftar menu, geser urutan, dan simpan otomatis sudah ada.
