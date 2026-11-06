# Tesfood (Next.js + Google Sheets + Gemini)

Versi Next.js dari situs Tesfood. Data makanan (nama, deskripsi maks. 14 kata, kalori per 100 g) disimpan di Google Sheets dan dibaca/ditulis lewat server. Gemini hanya dipanggil dari server, jadi API key tidak pernah sampai ke browser.

## Catatan perbaikan

### V2.0 Tahap 0–1 (6 November 2026, cabang `feature/menu-v2-development`, belum dirilis)

1. **Login per site.** Layar masuk memilih site: BCP, DPS, Kintap Project (hanya yang sudah punya PIN), atau Lainnya (ketik nama site yang didaftarkan admin). Tiap site punya PIN sendiri lewat `SITE_PINS` dan `SITE_CUSTOM` (lihat [Site dan PIN](#site-dan-pin)). `APP_PIN` lama tetap berlaku sebagai PIN BCP, dan cookie login lama tetap diterima sebagai BCP, jadi pengguna BCP tidak perlu login ulang.
2. **Isian terpisah per site di server.** Server menentukan site dari cookie login, tidak dari isi permintaan. BCP tetap memakai tab `draf`; site lain memakai tab `draf_<id>` (mis. `draf_dps`) yang dibuat otomatis. Perangkat DPS tidak bisa membaca atau menimpa isian BCP. Kalau satu tab browser login ke site lain, tab lama yang masih terbuka dimuat ulang dan tidak menulis ke site baru.
3. **Isian dan foto di perangkat juga per site.** Draf `localStorage` dan foto IndexedDB dipisah per site; BCP memakai kunci lama, jadi isian dan foto yang sudah ada tetap terbaca.
4. **Satu sumber identitas site** (`src/lib/site.ts`) untuk nama site di laporan Test Food, pesan kode warna, dan sampul video. Kode site laporan dan camp bawaan mengikuti site: BCP "DH BCP" / "Camp Pelangi", DPS "DH DPS", Kintap "DH Kintap", site custom dari `SITE_CUSTOM`. Info umum menampilkan site aktif dengan tombol **Ganti site**.
5. **Perbaikan bug:** nama site yang diawali "Site" tidak lagi ditulis "Site Site …"; laporan tidak lagi menulis "Site -"; laporan kalori site lain tidak lagi berjudul "DH BCP"; Mulai baru tidak lagi mengembalikan site ke BCP.
6. **Keamanan:** `AUTH_SECRET` wajib di produksi; mengganti PIN satu site hanya mencabut login site itu; batas PIN salah dihitung per IP dari `X-Real-IP` dan hanya menghitung percobaan gagal (banyak HP di satu Wi-Fi site tidak ikut terkunci).
7. **Uji otomatis:** `npm test` (Node 22, tanpa paket tambahan) dan uji browser `tests/e2e/site.e2e.mjs`. GitHub Actions di `.github/workflows/ci.yml`. Lihat [docs/TESTING.md](docs/TESTING.md).

**Belum selesai di tahap ini:** gambar poster, kartu kode warna, dan video untuk DPS, Kintap, dan site custom masih memakai template BCP (tulisan "BCP" dan logo DH) sampai file template bersih dari desainer tersedia; aplikasi menampilkan peringatan untuk itu. Upload logo custom, mode lokal/cloud, Test Food format baru, dan Info umum per waktu makan menyusul di tahap berikutnya ([CHANGELOG.md](CHANGELOG.md)).

**Sebelum merge dan deploy:**
1. Jalankan `npm install` sekali di komputer yang punya akses internet, lalu commit `package-lock.json`. Lockfile belum memuat `ffmpeg-static`, sehingga `npm ci` (CI dan VPS) gagal.
2. Pastikan `AUTH_SECRET` terisi (minimal 32 karakter acak) di Environment Variables Production dan Preview. Tanpa itu server menolak login.
3. Isi `SITE_PINS` (dan `SITE_CUSTOM` bila perlu). Tanpa itu hanya BCP yang aktif, memakai `APP_PIN`.
4. Uji di Preview: login BCP dengan PIN lama, login DPS dengan PIN DPS, pastikan isian kedua site tidak tercampur.

File baru: `src/lib/site.ts`, `src/lib/token.ts`, `src/app/api/auth/logout/route.ts`, `tests/*`, `.github/workflows/ci.yml`, `CHANGELOG.md`, `docs/DECISIONS.md`, `docs/TESTING.md`. File yang diubah: `src/lib/auth.ts`, `src/lib/sheets.ts`, `src/lib/store.ts`, `src/lib/report.ts`, `src/lib/idb.ts`, `src/lib/canvas.ts`, `src/app/api/auth/route.ts`, `src/app/api/draft/route.ts`, `src/components/App.tsx`, `src/components/FoodsContext.tsx`, `src/components/Login.tsx`, `src/components/PosterSection.tsx`, `src/components/useDraftSync.ts`, `src/app/globals.css`, `package.json`, `.env.example`, `README.md`.

### Pembaruan 3 (5 November 2026)

1. **Isian tersinkron antar perangkat (teks saja).** Menu bisa diketik di laptop lalu foto ditambahkan di HP, atau sebaliknya. Isian disimpan di tab baru `draf` pada Google Sheet yang sama (dibuat otomatis), dan tetap disimpan juga di `localStorage` supaya cepat dan aman saat offline. Cara kerjanya ada di bagian [Sinkronisasi isian](#sinkronisasi-isian).
2. **Foto bersifat sementara.** Foto (poster, kolase Test Food, foto laporan kalori) otomatis dihapus saat web dibuka di hari kerja baru. Hari kerja berganti pukul 03.00, sama dengan awal Breakfast, jadi foto Supper yang diambil lewat tengah malam tidak ikut terhapus.
3. **Draf juga berganti hari pukul 03.00** (sebelumnya tengah malam), dengan alasan yang sama. Kalau tab dibiarkan terbuka melewati pukul 03.00, halaman memuat ulang sendiri saat dibuka lagi.
4. **Id baris pola dibuat tetap** (mis. `B-sl-m1`), bukan acak, supaya foto yang diunggah di HP menempel di kotak poster yang sama dengan isian dari laptop.
5. **Daftar makanan dimuat ulang** saat kembali ke tab ini (paling sering sekali per menit), supaya makanan yang baru ditambahkan dari perangkat lain muncul di saran.
6. **Mulai baru** sekarang mengembalikan isian ke pola di semua perangkat, dan menghapus foto di perangkat yang menekan tombol itu.

File baru: `src/app/api/draft/route.ts`, `src/components/useDraftSync.ts`. File yang diubah: `src/lib/sheets.ts`, `src/lib/store.ts`, `src/lib/idb.ts`, `src/lib/text.ts`, `src/lib/pattern.ts`, `src/components/App.tsx`, `src/components/FoodsContext.tsx`, `.env.example`, `README.md`.

**Setelah deploy:** tambahkan `SHEET_DRAFT_TAB=draf` di Environment Variables Vercel (opsional; tanpa itu nama tab bawaannya juga `draf`). Tidak ada pengaturan Google tambahan, karena akun layanan yang sama dipakai.

### Pembaruan 2 (5 November 2026)

1. **Test Food Breakfast cukup sampai nomor 6**: Nasi Putih, 4 menu yang berubah, Sambal. Kerupuk, Roti & Selai, dan Gula, Kopi, Teh tidak lagi muncul di Test Food, tapi tetap ada di Daftar makanan (laporan kalori). Draf hari ini ikut disesuaikan; baris yang kamu tambah sendiri tidak dihapus.
2. **AI lebih cepat dan hemat**:
   - Tingkat berpikir Gemini diatur per model (`thinkingLevel`): `minimal` untuk Flash-Lite dan Flash 3.6, `low` untuk Flash 3.8 (yang menolak `minimal`). Tanpa pengaturan ini Flash 3.6 dan 3.8 berpikir di tingkat `medium`, jadi lebih lambat dan memakai lebih banyak token. Kalau suatu model menolak pengaturan itu, permintaan diulang sekali tanpanya.
   - Suhu (temperature) untuk Gemini 3 ke atas dibiarkan bawaan 1.0 sesuai saran Google (sebelumnya 0.1, yang menurut Google bisa membuat jawaban berulang atau menurun).
   - Aturan prompt dipindah ke system instruction; isi permintaan cukup nama makanannya.
   - Hasil AI disimpan 15 menit di memori server, dan nama yang sama yang ditanyakan bersamaan hanya memanggil AI sekali.
   - Model yang tidak ditemukan (404) dilewati 6 jam, yang kena batas (429) dilewati 60 detik, jadi tidak membuang waktu mencoba model yang pasti gagal.
   - Pop up "Apakah maksud kamu ini?" dicek dulu di browser, jadi muncul tanpa menunggu server.
   - Jatah `AI_DAILY_LIMIT` dikembalikan kalau panggilan gagal karena AI sibuk, kuota habis, atau belum diatur.
   - Log server mencatat waktu jawab dan jumlah token per panggilan (`[gemini] … ms, thinking=…, token in/berpikir/out=…`) untuk memantau.
3. **Dokumentasi penyimpanan data**: lihat bagian [Penyimpanan data dan sinkronisasi antar perangkat](#penyimpanan-data-dan-sinkronisasi-antar-perangkat).

File yang diubah: `src/lib/pattern.ts`, `src/lib/gemini.ts`, `src/lib/auth.ts`, `src/app/api/foods/resolve/route.ts`, `src/components/FoodsContext.tsx`, `README.md`.

### Pembaruan 1 (5 November 2026)

1. **Koreksi nama makanan hanya membetulkan typo.** Nama berbahasa asing dan merek tidak lagi diganti ke bahasa Indonesia atau bahasa lain. Prompt Gemini diperketat (dengan contoh), dan di server ada pengaman per kata: kata yang dikenal tidak pernah diubah, kata lain hanya boleh beda 1-3 huruf, dan jumlah serta urutan kata tidak boleh berubah. Contoh: "Chiken Katsu" jadi "Chicken Katsu", tapi "Chicken Katsu" tidak pernah jadi "Ayam Katsu"; "Ice Lemon Tea" tetap, tidak jadi "Es Teh Lemon". Pengaman lama punya celah: nama di bawah 5 huruf lolos tanpa dicek, dan satu kata yang diterjemahkan di nama panjang bisa lolos ("Rice Bowl" jadi "Nasi Bowl"). Keduanya sudah ditutup.
2. **Penulisan merek dipertahankan** saat kapitalisasi otomatis: "McFlurry", "KitKat", "PopMie" tidak lagi berubah jadi "Mcflurry" atau "Kitkat".
3. **Lunch dan Supper punya pola**: nomor 1 otomatis Nasi Putih dan nomor 6 otomatis Sambal. Draf hari ini yang daftar Lunch/Supper-nya masih kosong ikut terisi; daftar yang sudah diisi tidak disentuh.
4. **Live Cooking khusus Dinner.** Pilihannya hanya muncul saat waktu makan Dinner, dan baris Live Cooking tidak ditulis di laporan Breakfast, Lunch, atau Supper (walau sebelumnya sempat dicentang).

File yang diubah: `src/lib/text.ts`, `src/lib/gemini.ts`, `src/app/api/foods/resolve/route.ts`, `src/lib/pattern.ts`, `src/lib/report.ts`, `src/components/App.tsx`, `README.md`.

## Penyimpanan data dan sinkronisasi antar perangkat

| Data | Disimpan di | Terlihat di perangkat lain? |
|---|---|---|
| Data makanan (nama, deskripsi, kkal, ikon, status) | Google Sheet, lewat server | Ya. Semua perangkat membaca Sheet yang sama (server menyimpan salinan 60 detik untuk menghemat kuota, jadi perubahan dari perangkat lain bisa terlambat sampai 1 menit). |
| Isian (Info umum, Test Food, Daftar makanan, teks poster, kesimpulan) | Per site: tab `draf` (BCP) atau `draf_<id>` (site lain) di Google Sheet, plus salinan di `localStorage` browser (kunci `tfm2_draft` untuk BCP, `tfm2_draft:<id>` untuk site lain) | Ya, hanya ke perangkat yang login ke site yang sama. Lihat [Sinkronisasi isian](#sinkronisasi-isian). Besoknya (setelah pukul 03.00) mulai lagi dari pola. |
| Jenis menu yang kamu ketik sendiri | `localStorage` browser (kunci terpisah) | Tidak. |
| Foto (poster, kolase Test Food, foto laporan kalori) | IndexedDB browser, basis data `tesfoodNext`, dipisah per site | Tidak. Hanya di browser itu, dan dihapus otomatis saat hari kerja berganti (pukul 03.00). |
| Poster PNG dan video MP4 | Tidak disimpan di server | Dibuat lalu langsung diunduh atau dibagikan dari perangkat itu. Video disusun di `/api/video` dan dikirim balik tanpa disimpan. |
| Login | Cookie per browser (30 hari), berisi site dan ditandatangani server | Tidak. Tiap perangkat login sendiri, ke satu site. |

Jadi makanan dan isian yang diketik di HP muncul di laptop, tapi foto tetap di perangkat tempat foto itu diunggah. `localStorage` saja tidak bisa dipakai untuk sinkronisasi, karena isinya hanya bisa dibaca browser itu sendiri. Karena itu salinan bersamanya disimpan di Sheet, dan `localStorage` tetap dipakai sebagai salinan lokal.

### Sinkronisasi isian

- Saat web dibuka, perangkat mengambil isian dari Sheet dulu sebelum mengirim apa pun, jadi perangkat yang baru dibuka tidak menimpa isian perangkat lain.
- Setiap perubahan dikirim 1,5 detik setelah berhenti mengetik, dan langsung saat tab disembunyikan atau ditutup.
- Perangkat lain mengambil isian terbaru tiap 20 detik selama halaman terbuka, dan saat kembali ke tab ini.
- Kalau dua perangkat mengubah hampir bersamaan, yang terakhir diubah yang dipakai. Isian sebaiknya tidak diketik di dua perangkat pada saat yang sama.
- Tab yang sedang dibuka (Test Food / Menu & Kalori / Riwayat) tidak ikut, jadi laptop dan HP bisa membuka tab berbeda.
- Status tampil di atas Info umum: "Tersinkron, terakhir diubah 10.32 dari HP". Kalau offline, isian tetap tersimpan di perangkat itu dan terkirim otomatis saat online lagi (atau tekan "Coba sinkron").
- Satu draf per site: semua perangkat yang login ke site yang sama memakai draf yang sama. Site diambil server dari cookie login; permintaan dari tab yang membuka site lain ditolak (409) dan tab itu dimuat ulang.
- Isian disimpan sebagai JSON di baris 2 tab `draf` (BCP) atau `draf_<id>` (site lain): kolom A waktu, B hari, C perangkat, D dan seterusnya isi. Jangan diubah manual.
- Kuota: tiap perangkat yang terbuka membaca Sheet sekitar 3 kali per menit. Batas Google 60 per menit per pengguna, jadi aman untuk beberapa perangkat.

## Cara kerja nama makanan
Saat kamu selesai mengetik nama makanan (pindah kolom atau Enter):
1. **Cocok persis** (tanpa membedakan huruf besar kecil, spasi dan tanda baca dirapikan) → data dari Sheet dipakai, tanpa AI. Kolom diganti dengan penulisan di Sheet.
2. **Mirip** (typo) → muncul pop up "Apakah maksud kamu ini?". **Ya** = pakai data yang ada. **Bukan** = diperlakukan sebagai makanan baru.
3. **Baru** → Gemini memeriksa penulisan nama (hanya typo yang dibetulkan; nama asing dan merek seperti "Chicken Katsu" atau "Indomie" tidak diterjemahkan), deskripsi (maks. 14 kata), dan satu angka kkal per 100 g, lalu baris baru ditambahkan ke Sheet dengan `sumber = AI` dan `status = belum dicek`.

### Pengaman koreksi nama

Usulan nama dari AI tidak dipakai mentah-mentah. Server (`typoOnly` di `src/lib/text.ts`) membandingkannya kata per kata dengan yang kamu ketik:

- Kata yang dikenal tidak pernah diubah. Yang dikenal adalah daftar `KNOWN_WORDS` (istilah makanan asing yang umum seperti Chicken, Rice, Tea, Soup, Special, Spaghetti; variasi ejaan seperti Sop/Sup, Mie/Mi, Sambel/Sambal; dan merek seperti Indomie, Milo, Yakult) ditambah semua kata yang sudah ada di Sheet.
- Kata lain hanya boleh beda sedikit huruf: 1 huruf untuk kata sampai 6 huruf, 2 untuk 7-9 huruf, 3 untuk kata lebih panjang. Huruf tertukar ("Ayma" → "Ayam") dihitung satu.
- Jumlah dan urutan kata harus sama, kecuali AI hanya memisah atau menggabung spasi ("Ayamgoreng" → "Ayam Goreng").

Kata yang ditolak tetap ditulis seperti yang kamu ketik, dan penolakannya dicatat di log server (`[gemini] koreksi nama ditolak`). Kalau ada istilah asing atau merek yang sering kamu pakai dan belum ada di daftar, tambahkan ke `KNOWN_WORDS`, atau cukup simpan sekali di Sheet dengan ejaan yang benar.

Kalau AI gagal (misalnya sedang sibuk), tidak ada baris yang ditulis. Muncul pesan singkat dengan tombol "Coba lagi", dan aplikasi mencoba sekali lagi otomatis setelah beberapa detik. Kamu juga bisa mengisi kalori manual: makanan itu langsung ditambahkan ke Sheet tanpa AI.
Supaya deteksi typo bekerja sejak awal, isi Sheet dengan makanan yang sering dipakai (Riwayat → Impor cadangan lama, atau ketik langsung di Sheet). Sheet kosong berarti semua nama dianggap baru dan lewat AI.
Mengubah kalori di baris Daftar makanan (atau di tab Riwayat) memperbarui Sheet dan menandainya "sudah dicek".

## Struktur Sheet
Tab `makanan` (atau isi `SHEET_TAB`). Baris judul dibuat otomatis:
`key | nama | deskripsi | kkal_100g | sumber | status | diubah | ikon`
Sheet lama yang belum punya kolom `ikon` diperbarui otomatis (baris judul ditambah, data tidak disentuh).
Tab draf: `draf` untuk BCP dan `draf_<id site>` untuk site lain (mis. `draf_dps`, `draf_c-tambang-abc`), dibuat otomatis saat site itu pertama kali menyimpan.

## Menjalankan
Butuh Node.js 22 (google-auth-library 11.3 meminta Node 22 ke atas; `npm test` memakai fitur TypeScript bawaan Node 22.18+).
```bash
npm install
cp .env.example .env.local   # isi nilainya
npm run dev
npm test                     # uji otomatis, tanpa kredensial
```
Untuk mencoba tanpa kredensial: isi `MOCK_BACKEND=1` di `.env.local` (data sementara di memori server, AI berupa contoh). Tanpa `SITE_PINS`/`APP_PIN`, mode coba terbuka sebagai BCP tanpa login. Jangan dipakai di produksi.

## Site dan PIN
- Site standar ada di `src/lib/site.ts`: BCP (`bcp`), DPS (`dps`), Kintap Project (`kintap`). Site hanya bisa dipilih kalau punya PIN di `SITE_PINS`, mis. `SITE_PINS={"bcp":"1234","dps":"5678"}`. `APP_PIN` lama dipakai untuk BCP kalau `bcp` tidak diisi.
- Site lain didaftarkan di `SITE_CUSTOM`, mis. `SITE_CUSTOM=[{"nama":"Site Tambang ABC","pin":"4321","laporan":"ABC","camp":"Camp Utama"}]`. Saat login pengguna memilih **Lainnya** lalu mengetik nama site; huruf besar kecil dan awalan "Site" diabaikan. Daftar site custom tidak pernah ditampilkan di layar login.
- Konfigurasi yang rusak (bukan JSON, id site tidak dikenal, nama ganda) membuat server menolak permintaan dengan pesan jelas, bukan diam-diam diabaikan.
- Mengganti PIN satu site hanya membuat perangkat site itu login ulang. Mengganti `AUTH_SECRET` membuat semua site login ulang (termasuk cookie dari versi sebelum V2.0).
- Katalog makanan (tab `makanan`) tetap satu untuk semua site.

## Menyiapkan Google
1. Google Cloud Console: buat project, aktifkan **Google Sheets API**, buat **Service Account**, buat key JSON.
2. Buat Google Sheet, lalu bagikan ke email service account (`client_email`) sebagai **Editor**.
3. `SHEET_ID` = bagian URL Sheet di antara `/d/` dan `/edit`.
4. `GOOGLE_PRIVATE_KEY` = isi `private_key` dari JSON, baris baru ditulis sebagai `\n`.
5. `GEMINI_API_KEY` dari Google AI Studio. Model utama di `GEMINI_MODEL` (bawaan `gemini-3.1-flash-lite`, model ringan yang stabil dan punya tier gratis) dan cadangan di `GEMINI_FALLBACK_MODELS`. Kalau satu model sibuk (503) atau kena batas (429), aplikasi mencoba ulang lalu pindah ke model berikutnya. Tingkat berpikir diatur otomatis per model (lihat `thinkingFor` di `src/lib/gemini.ts`); kalau kamu mengganti model, periksa tabel `thinkingLevel` di dokumentasi Gemini. Cek daftar model terbaru di dokumentasi Gemini; model 2.5 dijadwalkan dimatikan 16 Oktober 2026.

## Deploy ke Vercel
Push ke GitHub, import di Vercel, isi semua variabel dari `.env.example` di Environment Variables, lalu Deploy. Jangan commit `.env.local`.
Catatan: paket Hobby dibatasi untuk pemakaian pribadi nonkomersial; cek ketentuan terbaru di vercel.com.
Video TV memakai paket `ffmpeg-static` (terpasang lewat `npm install`); `next.config.mjs` sudah mengatur supaya program ffmpeg ikut ke fungsi `/api/video`. Batas Vercel: kiriman dan jawaban maks. 4,5 MB per permintaan (kartu dikompres otomatis; video kartu diam biasanya di bawah 1 MB) dan waktu fungsi maks. 60 detik. Di server sendiri (VPS) cukup `npm install`, atau isi `FFMPEG_PATH` kalau sudah ada ffmpeg.

## Keamanan
- Semua route `/api/*` (kecuali login) butuh login PIN site (`SITE_PINS`/`SITE_CUSTOM`/`APP_PIN`), dengan cookie `httpOnly` bertanda tangan memakai `AUTH_SECRET`. `AUTH_SECRET` wajib di produksi (minimal 32 karakter acak).
- Data isian dipisah per site di server; site selalu diambil dari cookie yang ditandatangani, tidak dari isi permintaan.
- Batas PIN salah: 10 kali per 10 menit per IP (IP dari `X-Real-IP` yang diisi proxy). Login yang berhasil tidak dihitung.
- Batas panggilan AI per hari (`AI_DAILY_LIMIT`) dihitung di memori tiap instance server, jadi hanya pembatas kasar. Pasang juga batas biaya/kuota di Google AI Studio.
- Kuota Google Sheets: 300 baca/menit per project dan 60/menit per pengguna; akun layanan dihitung satu pengguna. Karena itu isi Sheet di-cache 60 detik di server.

## Info umum
- **Jenis menu**: pilih dari daftar (Reguler, Tematik, BBQ, Healthy Food) atau ketik sendiri; yang kamu ketik diingat di daftar.
- **Live Cooking** (khusus Dinner): pilihan ini hanya muncul saat waktu makan Dinner. Centang, lalu isi menu yang live. Baris `👩‍🍳 Live Cooking : …` muncul di laporan kalori, dan `*Live Cooking : …*` di laporan Test Food (di antara judul dan tanggal). Di Breakfast, Lunch, dan Supper baris ini tidak pernah ditulis.
- **Waktu makan otomatis** mengikuti jam: Breakfast 03.00-08.59, Lunch 09.00-13.59, Dinner 14.00-17.59, Supper 18.00-02.59. Memilih sendiri mematikan otomatis; centang lagi untuk kembali ke jam.
- Nama makanan otomatis ditulis **Capitalize Each Word** (singkatan 1-3 huruf besar seperti BBQ tetap, dan penulisan merek seperti McFlurry atau KitKat juga tetap).

## Pola daftar makanan dan sinkronisasi
Tiap waktu makan punya daftarnya sendiri, dengan baris tetap yang terisi otomatis (bebas diubah, digeser, atau dihapus):
- **Breakfast**: Daftar makanan 1 Nasi Putih, 2-5 menu yang berubah, 6 Sambal, 7 Kerupuk, 8 Roti & Selai, 9 Gula, Kopi, Teh. Test Food cukup sampai nomor 6 (Nasi Putih, 4 menu, Sambal).
- **Dinner**: 1 Nasi Putih, 2-5 menu yang berubah, 6 Sambal, 7 Buah, 8-9 Kue. Di Test Food, Buah dan Snack adalah nomor 7 dan 8-9.
- **Lunch dan Supper**: 1 Nasi Putih, 2-5 menu yang berubah, 6 Sambal. Hanya Test Food (tab Menu & Kalori tidak dipakai).

Baris yang sama (nomor 2-5, dan pada Dinner juga Buah dan Kue) **tersinkron** antara Test Food, Daftar makanan, dan Poster menu: isi di salah satu, yang lain langsung terisi (nama, kalori, dan deskripsi dari Sheet). Poster Breakfast (4 menu) = nomor 2-5; poster Dinner (6 menu) = nomor 2, 3, 4, 5, 8, 9. Sinkronisasi mengikuti baris (bukan posisinya), jadi menggeser urutan di satu daftar tidak mengubah urutan daftar lain. Baris yang kamu tambah sendiri tidak ikut tersinkron.
Draf dari hari kerja sebelumnya (berganti pukul 03.00) memulai lagi dari pola (menu kemarin tidak terbawa). Daftar makanan dari draf versi lama dibuang saat pembaruan ini.

## Pukul (Test Food)
Di tab Test Food, centang "Tampilkan Pukul" untuk menambah baris `*Pukul : 10.34 WITA*` tepat di bawah tanggal. Jam terisi dari jam sekarang saat dicentang dan bisa diubah; zona waktu WIB/WITA/WIT bisa dipilih (bawaan WITA). Hanya berlaku di laporan Test Food.

## Ikon makanan
Ikon di daftar makanan dipilih otomatis dari nama (lebih dari 100 kata kunci; jenis hidangan didahulukan atas bahan, mis. "Mie Ayam" = 🍜). Ketuk ikon untuk memilih sendiri dari kisi emoji atau mengetik emoji; pilihan itu disimpan di kolom `ikon` Sheet dan dipakai lagi saat nama yang sama diketik. Bisa juga diubah di tab Riwayat.

## Poster dan kolase
Semua fitur poster dan kolase dari versi HTML sudah ada:
- **Poster menu** (tab Menu & Kalori, untuk Breakfast dan Dinner): form 4 menu (Breakfast, template Kantin BCP) atau 6 menu (Dinner, dengan deskripsi). Nama, kalori, dan deskripsi terisi dari Sheet. Foto disimpan di browser (IndexedDB), jadi tidak hilang saat reload, dan dihapus otomatis di hari kerja berikutnya. Geser ⠿ untuk memindah urutan; foto ikut pindah.
- **Poster kode warna (kolase)**: satu kartu landscape per menu (foto, kalori, nama, kartu kode warna), dua ke samping lalu ke bawah.
- **Video untuk TV (MP4)**: tombol "Buat video TV" di bawah poster. Urutan: sampul (`public/assets/video-sampul.jpg` + jenis menu dan "SITE ..." dari Info umum, font Ms Madi dan Archivo Black), kartu landscape tiap menu, lalu penutup `public/assets/video-penutup.jpg` ("Selamat Menikmati"). Tiap gambar tampil 5 detik dengan transisi halus, 1920×1080, 25 fps, H.264 + audio senyap (diputar TV, HP, dan WhatsApp). Kartu digambar di HP, lalu MP4 disusun di server dengan ffmpeg (`/api/video`), jadi hasilnya sama di iPhone dan Android. Setelah jadi: putar untuk cek, lalu "Unduh video" atau "Simpan ke Galeri / bagikan". Maksimal 10 gambar per video (sampul + 8 menu + penutup).
- **Kode warna makanan**: kartu per baris Daftar makanan, unduh satu per satu atau semua jadi satu gambar.
- **Foto untuk laporan kalori** dan **Kolase foto Test Food**: unggah foto, kolase otomatis, unduh atau kirim ke WhatsApp bersama teks.
- **Mulai baru** mengembalikan isian ke pola di semua perangkat dan menghapus foto di browser ini (data makanan di Sheet tidak tersentuh).

Catatan:
- Gambar template ada di `public/assets/` (poster Breakfast dan Dinner, kartu landscape, logo, wajah kartu). Ganti file dengan nama yang sama untuk mengubah desain.
- Font poster (Gaegu, Playfair Display SC, Hanken Grotesk) dimuat dari Google Fonts; kalau gagal dimuat dipakai font cadangan.
- Kirim gambar + teks lewat menu bagikan HP butuh HTTPS dan browser yang mendukung. Kalau tidak didukung, gambar disimpan dan teks disalin.
- Lunch dan Supper tidak punya poster, hanya laporan teks.

## Biaya Gemini
Menurut halaman harga Gemini (dicek 15 Oktober 2026), model ringan seperti `gemini-3.1-flash-lite` dan `gemini-3.5-flash-lite` punya **tier gratis** untuk input dan output. Batas per menit/hari bergantung model dan hanya terlihat di Google AI Studio (halaman Rate limit); batas itu tidak dijamin. Di tier gratis, isi permintaan boleh dipakai Google untuk meningkatkan produknya, jadi jangan kirim data sensitif (nama makanan aman). Tier berbayar baru berlaku kalau kamu menautkan akun penagihan di AI Studio. Satu pencarian makanan baru memakai sekitar ratusan token, jadi kalau suatu saat berbayar pun biayanya sangat kecil.
