# Tesfood (Next.js + Google Sheets + Gemini)

Versi Next.js dari situs Tesfood. Data makanan (nama, deskripsi maks. 14 kata, kalori per 100 g) disimpan di Google Sheets dan dibaca/ditulis lewat server. Gemini hanya dipanggil dari server, jadi API key tidak pernah sampai ke browser.

## Catatan perbaikan

### Pembaruan 4 (13 November 2026)

**Status pengujian.** `npm install` tidak bisa dijalankan di lingkungan tempat pembaruan ini dibuat, jadi `npm run build` (Next.js) **belum dijalankan**. Yang sudah diuji: seluruh kode klien dan route API dibundel dengan esbuild dan dijalankan di Chrome ukuran HP dengan server tiruan (mode `MOCK_BACKEND`), termasuk 19 skenario otomatis (sinkron dua perangkat, pindah site, logo, simpanan foto, sinkron mati/nyala, Mulai baru). Yang **belum** diuji: build Next.js asli, Google Sheets asli (termasuk pemindahan tab `draf` lama), drag-and-drop (@dnd-kit diganti tiruan saat uji), video dengan logo site, dan font Google di poster (uji memakai font cadangan). Jalankan `npm install && npm run build` dan coba sekali di HP sebelum dipakai harian.

#### 1. Sinkronisasi per site, bisa dimatikan

- Isian sekarang **satu draf per site**. Perangkat hanya tersinkron dengan perangkat lain yang memilih site yang sama (nama sama; huruf besar kecil tidak dibedakan). Site BCP dan site lain tidak saling memengaruhi.
- Tombol **Sinkron: nyala/mati** di bilah status. Mematikan memunculkan pop up konfirmasi; setelah itu isian hanya disimpan di perangkat itu (`localStorage`), tidak dikirim dan tidak diambil. Menyalakan lagi juga lewat pop up, dengan dua pilihan: gabungkan isian perangkat dengan server, atau pakai isian server saja.
- **Tidak lagi "yang terakhir menang" untuk seluruh isian.** Server memberi nomor versi; kiriman dari perangkat yang belum melihat versi terakhir ditolak, lalu perangkat itu menggabungkan perubahannya per bagian dan per baris (`src/lib/merge.ts`) dan mengirim ulang. Dua orang di site yang sama bisa mengisi baris berbeda bersamaan. Kalau baris yang sama diubah dua orang, perangkat yang mengirim belakangan yang dipakai.
- Urutan tidak lagi bergantung pada jam HP (dulu HP dengan jam lebih maju selalu menang).
- Pilihan site, tab yang dibuka, dan sinkron nyala/mati milik perangkat masing-masing (tidak ikut tersinkron).
- Foto poster dan kolase dipisah per site di perangkat yang sama.
- "Mulai baru" sekarang pop up (bukan klik dua kali), hanya mengosongkan site yang sedang dipilih, dan tidak mereset jenis menu, camp, kode site, zona, dan format.

#### 2. Site "Lainnya": tulisan site dan logo di poster, kolase, dan video

- Pilih **Site → Lainnya…**, ketik nama, tekan **Pakai**. Nama diingat di daftar pilihan perangkat itu.
- Untuk site selain BCP:
  - Poster Breakfast: "Kantin BCP" diganti **"Site <nama>"**. Poster Dinner: hiasan "Site BCP" diganti hiasan serupa berisi nama site.
  - **Logo DH dihilangkan** di poster biasa, kartu kolase kode warna, sampul video, kartu video, dan penutup video.
  - Muncul **form unggah logo** di Info umum. Logo yang diunggah dipasang di tempat logo DH (kotak putih, logo di tengah). Logo dikecilkan ke 480 px dan ikut tersinkron (tab `logo` di Sheet).
  - Laporan kalori: "Kode site laporan" bawaannya nama site, dan baris Camp tidak ditulis kalau kosong.
- Site BCP tidak berubah sama sekali (desain asli).
- Logo Dire Pratama Services (kiri atas) tetap. Kalau perlu diganti juga, itu belum dikerjakan.
- Posisi kotak logo dan tulisan ada di `LOGO_BOX`, `brandBreakfast`, `brandDinner` (`src/lib/canvas.ts`). Kalau gambar template diganti, angka di situ perlu disesuaikan.

#### 3. Format Test Food baru (bawaan) + format lama tetap ada

Pilihan di tab Test Food: **Nilai 1-5 (baru)** atau **Keterangan (lama)**.

```
*Test Food Menu*
*Jumat, 06 November 2026*

*Menu Breakfast Site BCP*
1. Nasi Putih : 5
...
6. Sambal : 4

Ket:
* 5 : Baik Sekali
* 4 : Baik
* 3 : Cukup
* 2 : Kurang
* 1 : Sangat Kurang

Kesimpulan : Makanan layak untuk dikonsumsi
```

- Nilai dipilih dengan tombol 1-5, **bawaan 5**. Nilai (format baru) dan keterangan (format lama) disimpan terpisah, jadi pindah format tidak menghapus isian.
- Kesimpulan bawaan mengikuti format (baru: "Makanan layak untuk dikonsumsi"), kecuali sudah kamu ubah sendiri.
- Keputusan yang saya ambil dan perlu kamu cek: (a) jenis menu hanya ditulis di judul kalau **bukan Reguler** (mis. `*Test Food Menu BBQ*`), karena contohmu tidak memuatnya; (b) nama tetap ditulis Capitalize Each Word ("Nasi Putih"), contohmu "Nasi putih"; (c) hari ditulis "Jumat" di format baru, "Jum’at" di format lama; (d) Snack dan Buah (Dinner), Live Cooking, dan Pukul tetap di posisi yang sama seperti format lama.
- Kalau ada menu bernilai 2 ke bawah, muncul pengingat di bawah Kesimpulan.

#### 4. Tampilan HP dan kemudahan pakai

- Navigasi tab pindah ke **bawah layar** di HP; di laptop tetap di atas dan menempel saat digulir.
- Bilah status: site, status sinkron (titik hijau/oranye/merah), tombol Sinkron dan Mulai baru.
- Kartu **Cara pakai** (4 langkah) saat pertama dibuka; tombol **?** untuk membukanya lagi.
- **Info umum bisa dilipat**; saat dilipat tampil ringkasan (waktu makan, tanggal, site, jenis menu).
- Sasaran ketuk minimal 44 px di layar sentuh; pop up tampil sebagai lembar dari bawah; tombol pilih foto besar; kotak poster satu kolom di layar sempit.
- Untuk Lunch/Supper, tab Menu & Kalori punya tombol langsung ke Breakfast/Dinner.
- Bisa dipasang di layar utama HP (manifest + ikon `public/icon-192.png`, `icon-512.png`).

#### 5. Ikon makanan

- Kata kunci bertambah (lebih dari 600, termasuk istilah Inggris dan ikan lokal seperti haruan, papuyu, saluang) dan pilihan ikon dikelompokkan (Nasi/mie/roti, Lauk, Sayur, Buah, Kue, Minuman).
- Aturan pemilihan diganti (`src/lib/icons.ts`): jenis hidangan menang di posisi mana pun; kalau tidak ada, **bahan yang paling depan** di nama yang dipakai; bumbu dan cara masak hanya cadangan. Contoh yang dulu salah: "Ayam Bakar Sambal Matah" (dulu 🌶️, sekarang 🍗), "Udang Saus Telur Asin" (dulu 🥚, sekarang 🦐), "Beef Teriyaki" (dulu 🐟 karena "teri", sekarang 🥩), "Buah Semangka" (🍉).
- Kerupuk/peyek jadi 🍘. Tahu jadi 🧈 karena emoji tahu tidak ada; kalau kurang cocok, ketuk ikon untuk memilih sendiri.

#### 6. Simpanan foto per nama menu (baru)

Foto yang dipasang di kotak poster disimpan dengan kunci nama menunya dan **dipasang lagi otomatis** saat nama yang sama dipakai di hari lain. Lihat [Foto menu yang muncul lagi](#foto-menu-yang-muncul-lagi).

#### 7. Bug dan hal yang dioptimalkan

| Masalah | Akibat | Perbaikan |
|---|---|---|
| Sinkron menimpa seluruh isian ("terakhir menang") | Mengetik di perangkat yang belum sempat mengambil isian terbaru menghapus isian perangkat lain | Versi dari server + gabung per baris |
| Urutan memakai jam perangkat | HP dengan jam lebih maju selalu menang | Versi diberi server |
| Perubahan otomatis (waktu makan menurut jam, kalori baris tetap) dihitung sebagai ketikan | Perangkat yang baru dibuka bisa mengirim isiannya dan menimpa yang lain | Perubahan otomatis tidak dihitung sebagai perubahan lokal |
| Foto kamera disimpan ukuran asli (5-12 MB) | Penyimpanan cepat penuh, poster berat, bisa membuat browser HP tertutup sendiri | Foto dikecilkan ke 1600 px saat dipilih |
| URL dan bitmap foto tidak pernah dilepas | Memori terus naik saat foto diganti-ganti | Dilepas setelah diganti/dihapus |
| Foto yang gagal dibaca di kolase diabaikan diam-diam | Pengguna tidak tahu fotonya tidak masuk | Muncul pesan jumlah foto yang gagal |
| Ikon: awalan kata dicocokkan bebas | "teri" cocok dengan "teriyaki", "tahu" dengan "tahun" | Hanya sama persis atau berakhiran -an/-nya/-s |
| "Kosongkan" daftar makanan langsung jalan | Sekali salah ketuk, hubungan baris dengan Test Food/poster putus | Pop up konfirmasi |
| Judul format lama punya spasi sisa kalau jenis menu kosong | `*Test Food Menu *` tidak tebal di WhatsApp | Spasi dibuang |
| Tanggal tidak valid di draf | Laporan bisa menulis "undefined" | Jatuh ke tanggal hari ini |
| Pesan toast dipanggil di dalam pembaruan state | Bisa muncul dua kali | Dipindah keluar |

Belum diperbaiki (diketahui): baca-lalu-tulis ke Sheet tidak atomik, jadi dua kiriman dalam sepersekian detik yang sama masih bisa saling menimpa; pembatas percobaan PIN dan kuota AI hanya di memori satu instance server; foto simpanan yang diganti di perangkat lain tidak menggantikan salinan yang sudah ada di perangkat ini.

#### File

Baru: `src/lib/icons.ts`, `src/lib/merge.ts`, `src/lib/local.ts`, `src/lib/logo.ts`, `src/lib/photolib.ts`, `src/lib/photostore.ts`, `src/components/Confirm.tsx`, `src/app/api/logo/route.ts`, `src/app/api/photo/route.ts`, `src/app/manifest.ts`, `public/icon-192.png`, `public/icon-512.png`, `Dockerfile`.
Diubah: `src/components/App.tsx`, `useDraftSync.ts`, `TestFoodTab.tsx`, `KaloriTab.tsx`, `PosterSection.tsx`, `TfCollage.tsx`, `FotoSection.tsx`, `IconPicker.tsx`, `src/lib/report.ts`, `text.ts`, `canvas.ts`, `sheets.ts`, `store.ts`, `idb.ts`, `photos.ts`, `src/app/api/draft/route.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `.env.example`, `README.md`.

**Setelah deploy:** tidak ada variabel wajib baru. Tab `draf` lama dipindah otomatis ke susunan baru (kolom A = site; isian lama masuk ke site `bcp`), dan tab `logo` dibuat otomatis. Semua perangkat perlu memuat ulang halaman sekali. Opsional: `SHEET_LOGO_TAB`, `PHOTO_DIR`.

## Foto menu yang muncul lagi

**Yang sudah jalan tanpa pengaturan:** foto yang kamu pasang di kotak poster disimpan di browser perangkat itu (IndexedDB, dikecilkan ke 1280 px) dengan kunci nama menu. Besok atau minggu depan, saat nama menu yang sama diisi di poster, fotonya terpasang sendiri dengan keterangan "Dari simpanan foto menu ini". Memasang foto baru untuk menu itu mengganti simpanannya; "Hapus dari simpanan" membuangnya. Batasnya: hanya di perangkat itu, dan hilang kalau data situs di browser dihapus.

**Supaya muncul di semua perangkat**, fotonya harus disimpan di server. Pilihan, dari yang paling mudah:

1. **Folder di server sendiri (sudah didukung).** Kalau web dipindah ke VPS, isi `PHOTO_DIR=/var/lib/tesfood/foto`. Foto dikirim ke `/api/photo` dan disimpan sebagai file JPEG di folder itu, lalu diambil perangkat lain saat menu yang sama dipakai. Tidak perlu layanan tambahan. Cadangkan folder itu sesekali.
2. **Penyimpanan objek** (Vercel Blob, Cloudflare R2, Supabase Storage) kalau tetap di Vercel. Belum dibuat; yang perlu diganti hanya isi `src/lib/photostore.ts` (tiga fungsi: baca, tulis, hapus).
3. **Google Drive.** Bisa, tapi paling repot. Akun layanan (service account) yang sekarang dipakai untuk Sheets tidak punya kuota penyimpanan Drive, jadi unggahan ke folder "Drive Saya" yang dibagikan ditolak dengan pesan "Service Accounts do not have storage quota". Jalan keluarnya: (a) **Shared Drive** (butuh Google Workspace, akun layanan dijadikan anggota), atau (b) **OAuth atas nama akunmu** (buat OAuth client, simpan refresh token di server). Setelah itu perlu aktifkan Drive API dan menulis kode unggah/unduh di `photostore.ts`. Saya sarankan pilihan 1 atau 2.

Foto disimpan per nama makanan untuk semua site (data makanan juga dipakai bersama). Kalau sinkronisasi dimatikan, foto tidak dikirim ke server.

## Pindah ke hosting sendiri

Data makanan, draf, dan logo ada di Google Sheet, jadi pindah hosting **tidak memindahkan data**: cukup jalankan kode yang sama dengan variabel lingkungan yang sama.

Syarat hosting: bisa menjalankan **Node.js 20.9 atau lebih baru** sebagai proses yang terus hidup, dan punya **HTTPS**. Hosting PHP/statis saja tidak bisa (web ini punya server: login, Sheets, Gemini, video). Kalau yang kamu maksud hanya memakai domain sendiri, tidak perlu pindah: tambahkan domain di Vercel (Settings → Domains) dan arahkan DNS-nya.

### VPS (Ubuntu), cara yang disarankan

```bash
# 1. Node.js 22, git, ffmpeg
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git ffmpeg nginx

# 2. Kode
sudo mkdir -p /opt/tesfood /var/lib/tesfood/foto && sudo chown $USER /opt/tesfood /var/lib/tesfood/foto
git clone https://github.com/mfadhilhani/Menu-V1.0.git /opt/tesfood && cd /opt/tesfood
npm ci

# 3. Variabel lingkungan: salin semua dari Vercel (Settings → Environment Variables)
cp .env.example .env.local && nano .env.local
#    tambahkan: PHOTO_DIR=/var/lib/tesfood/foto
#    kalau video gagal dengan ffmpeg bawaan paket: FFMPEG_PATH=/usr/bin/ffmpeg

# 4. Build dan jalankan
npm run build
sudo npm i -g pm2
pm2 start "npm run start -- -p 3000" --name tesfood && pm2 save && pm2 startup
```

Nginx sebagai pintu depan (`/etc/nginx/sites-available/tesfood`), lalu HTTPS dengan certbot:

```nginx
server {
  server_name menu.domainmu.com;
  client_max_body_size 12m;            # kiriman kartu video
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 90s;            # pembuatan video
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tesfood /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d menu.domainmu.com
```

Hal yang sering terlewat:

- **HTTPS wajib.** Cookie login diberi tanda `secure` di produksi, jadi lewat `http://` login selalu gagal. Menu bagikan gambar ke WhatsApp juga butuh HTTPS.
- `GOOGLE_PRIVATE_KEY` ditulis satu baris dengan `\n` dan diapit tanda kutip, sama seperti di Vercel.
- `AUTH_SECRET` boleh sama dengan yang lama (login di HP tetap berlaku) atau diganti (semua perangkat login ulang).
- Gunakan `X-Forwarded-For $remote_addr` seperti di atas, supaya pembatas percobaan PIN tidak bisa diakali dengan header palsu.
- Batas 4,5 MB dan 60 detik milik Vercel tidak berlaku lagi; batasnya `client_max_body_size` dan `proxy_read_timeout`.
- Memperbarui: `cd /opt/tesfood && git pull && npm ci && npm run build && pm2 restart tesfood`.

### Docker

`Dockerfile` disertakan (belum diuji build-nya):

```bash
docker build -t tesfood .
docker run -d --name tesfood --restart unless-stopped -p 3000:3000 --env-file .env.local -e PHOTO_DIR=/data/foto -v tesfood-foto:/data/foto tesfood
```

### cPanel / shared hosting

Hanya bisa kalau ada menu **Setup Node.js App** dengan Node 20+ dan boleh menjalankan proses (`next start`). Banyak shared hosting membatasi memori dan melarang menjalankan ffmpeg, jadi video TV bisa gagal walau bagian lain jalan. Kalau ragu, VPS kecil (1 GB RAM cukup; build lebih nyaman dengan 2 GB) lebih aman.

### Urutan pindah yang aman

1. Pasang di hosting baru dengan Sheet yang sama, buka lewat alamat sementara atau subdomain.
2. Uji: login, ketik menu (saran dan kalori muncul), sinkron dua perangkat, poster, video, simpan foto.
3. Arahkan domain ke hosting baru. Vercel boleh tetap hidup beberapa hari sebagai cadangan (keduanya memakai Sheet yang sama; hanya simpanan foto server yang tidak ada di Vercel).
4. Setelah yakin, hapus atau jeda proyek di Vercel.

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
| Isian (Info umum, Test Food, Daftar makanan, teks poster, kesimpulan) | Tab `draf` di Google Sheet (satu baris per site), plus salinan di `localStorage` browser (kunci `tfm2_d:<site>`) | Ya, dengan perangkat pada site yang sama, selama sinkronisasi menyala. Lihat [Sinkronisasi isian](#sinkronisasi-isian). Besoknya (setelah pukul 03.00) mulai lagi dari pola. |
| Pilihan perangkat (site, tab, sinkron nyala/mati, daftar site lain) | `localStorage` browser (kunci `tfm2_prefs`) | Tidak. |
| Jenis menu yang kamu ketik sendiri | `localStorage` browser (kunci terpisah) | Tidak. |
| Logo site selain BCP | Tab `logo` di Google Sheet, plus IndexedDB browser | Ya, pada site yang sama. |
| Foto poster hari ini, kolase Test Food, foto laporan kalori | IndexedDB browser, basis data `tesfoodNext` | Tidak. Hanya di browser itu, dan dihapus otomatis saat hari kerja berganti (pukul 03.00). |
| Simpanan foto per nama menu | IndexedDB browser (tidak dihapus harian); juga folder `PHOTO_DIR` di server kalau diisi | Hanya kalau `PHOTO_DIR` diisi. Lihat [Foto menu yang muncul lagi](#foto-menu-yang-muncul-lagi). |
| Poster PNG dan video MP4 | Tidak disimpan di server | Dibuat lalu langsung diunduh atau dibagikan dari perangkat itu. Video disusun di `/api/video` dan dikirim balik tanpa disimpan. |
| Login PIN | Cookie per browser (30 hari) | Tidak. Tiap perangkat login sendiri. |

Jadi makanan dan isian yang diketik di HP muncul di laptop, tapi foto tetap di perangkat tempat foto itu diunggah. `localStorage` saja tidak bisa dipakai untuk sinkronisasi, karena isinya hanya bisa dibaca browser itu sendiri. Karena itu salinan bersamanya disimpan di Sheet, dan `localStorage` tetap dipakai sebagai salinan lokal.

### Sinkronisasi isian

- Satu draf per site. Perangkat hanya tersinkron dengan perangkat lain yang memilih site yang sama.
- Saat web dibuka (atau site diganti), perangkat mengambil isian site itu dari Sheet dulu sebelum mengirim apa pun.
- Setiap perubahan dikirim 1,5 detik setelah berhenti mengetik, dan langsung saat tab disembunyikan atau ditutup.
- Perangkat lain menanyakan versi terbaru tiap 20 detik selama halaman terbuka, saat kembali ke tab, dan saat online lagi.
- Kalau dua perangkat mengubah sebelum saling tersinkron, perubahan digabung per bagian dan per baris. Baris yang sama diubah di dua perangkat: yang mengirim belakangan yang dipakai.
- Tab yang dibuka, site yang dipilih, dan sinkron nyala/mati tidak ikut tersinkron.
- Status tampil di bilah atas: "Tersinkron 10.32 · HP", "Menyimpan…", "Belum tersinkron (offline?)", atau "Lokal: hanya di perangkat ini". Kalau offline, isian tetap tersimpan di perangkat dan terkirim otomatis saat online lagi.
- Sinkronisasi bisa dimatikan per perangkat (tombol "Sinkron", dengan pop up konfirmasi).
- Semua orang yang tahu PIN bisa membuka site mana pun; pemisahan site bukan pembatas akses.
- Isian disimpan sebagai JSON di tab `draf`: kolom A site, B versi, C hari, D perangkat, E dan seterusnya isi. Jangan diubah manual.
- Kuota: tiap perangkat yang terbuka membaca Sheet sekitar 3 kali per menit. Batas Google 60 per menit per pengguna, jadi aman sampai sekitar 15 perangkat terbuka bersamaan.

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
5. `GEMINI_API_KEY` dari Google AI Studio. Model utama di `GEMINI_MODEL` (bawaan `gemini-3.1-flash-lite`, model ringan yang stabil dan punya tier gratis) dan cadangan di `GEMINI_FALLBACK_MODELS`. Kalau satu model sibuk (503) atau kena batas (429), aplikasi mencoba ulang lalu pindah ke model berikutnya. Tingkat berpikir diatur otomatis per model (lihat `thinkingFor` di `src/lib/gemini.ts`); kalau kamu mengganti model, periksa tabel `thinkingLevel` di dokumentasi Gemini. Cek daftar model terbaru di dokumentasi Gemini; model 2.5 dijadwalkan dimatikan 16 Oktober 2026.

## Deploy ke Vercel
Push ke GitHub, import di Vercel, isi semua variabel dari `.env.example` di Environment Variables, lalu Deploy. Jangan commit `.env.local`.
Catatan: paket Hobby dibatasi untuk pemakaian pribadi nonkomersial; cek ketentuan terbaru di vercel.com.
Video TV memakai paket `ffmpeg-static` (terpasang lewat `npm install`); `next.config.mjs` sudah mengatur supaya program ffmpeg ikut ke fungsi `/api/video`. Batas Vercel: kiriman dan jawaban maks. 4,5 MB per permintaan (kartu dikompres otomatis; video kartu diam biasanya di bawah 1 MB) dan waktu fungsi maks. 60 detik. Di server sendiri (VPS) cukup `npm install`, atau isi `FFMPEG_PATH` kalau sudah ada ffmpeg.

## Keamanan
- Semua route `/api/*` (kecuali login) butuh login PIN (`APP_PIN`, cookie `httpOnly` bertanda tangan memakai `AUTH_SECRET`). Isi `AUTH_SECRET` dengan teks acak panjang.
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
Ikon di daftar makanan dipilih otomatis dari nama (aturan dan kata kunci di `src/lib/icons.ts`; jenis hidangan didahulukan atas bahan, mis. "Mie Ayam" = 🍜). Ketuk ikon untuk memilih sendiri dari kisi emoji atau mengetik emoji; pilihan itu disimpan di kolom `ikon` Sheet dan dipakai lagi saat nama yang sama diketik. Bisa juga diubah di tab Riwayat.

## Poster dan kolase
Semua fitur poster dan kolase dari versi HTML sudah ada:
- **Poster menu** (tab Menu & Kalori, untuk Breakfast dan Dinner): form 4 menu (Breakfast, template Kantin BCP) atau 6 menu (Dinner, dengan deskripsi). Nama, kalori, dan deskripsi terisi dari Sheet. Foto disimpan di browser (IndexedDB), jadi tidak hilang saat reload, dan dihapus otomatis di hari kerja berikutnya. Geser ⠿ untuk memindah urutan; foto ikut pindah.
- **Poster kode warna (kolase)**: satu kartu landscape per menu (foto, kalori, nama, kartu kode warna), dua ke samping lalu ke bawah.
- **Video untuk TV (MP4)**: tombol "Buat video TV" di bawah poster. Urutan: sampul (`public/assets/video-sampul.jpg` + jenis menu dan "SITE ..." dari Info umum, font Ms Madi dan Archivo Black), kartu landscape tiap menu, lalu penutup `public/assets/video-penutup.jpg` ("Selamat Menikmati"). Tiap gambar tampil 5 detik dengan transisi halus, 1920×1080, 25 fps, H.264 + audio senyap (diputar TV, HP, dan WhatsApp). Kartu digambar di HP, lalu MP4 disusun di server dengan ffmpeg (`/api/video`), jadi hasilnya sama di iPhone dan Android. Setelah jadi: putar untuk cek, lalu "Unduh video" atau "Simpan ke Galeri / bagikan". Maksimal 10 gambar per video (sampul + 8 menu + penutup).
- **Kode warna makanan**: kartu per baris Daftar makanan, unduh satu per satu atau semua jadi satu gambar.
- **Foto untuk laporan kalori** dan **Kolase foto Test Food**: unggah foto, kolase otomatis, unduh atau kirim ke WhatsApp bersama teks.
- **Mulai baru** mengembalikan isian site yang dipilih ke pola (di semua perangkat site itu kalau sinkronisasi menyala) dan menghapus foto poster/kolase site itu di browser ini. Data makanan, logo, dan simpanan foto menu tidak tersentuh.

Catatan:
- Gambar template ada di `public/assets/` (poster Breakfast dan Dinner, kartu landscape, logo, wajah kartu). Ganti file dengan nama yang sama untuk mengubah desain.
- Font poster (Gaegu, Playfair Display SC, Hanken Grotesk) dimuat dari Google Fonts; kalau gagal dimuat dipakai font cadangan.
- Kirim gambar + teks lewat menu bagikan HP butuh HTTPS dan browser yang mendukung. Kalau tidak didukung, gambar disimpan dan teks disalin.
- Lunch dan Supper tidak punya poster, hanya laporan teks.

## Biaya Gemini
Menurut halaman harga Gemini (dicek 15 Oktober 2026), model ringan seperti `gemini-3.1-flash-lite` dan `gemini-3.5-flash-lite` punya **tier gratis** untuk input dan output. Batas per menit/hari bergantung model dan hanya terlihat di Google AI Studio (halaman Rate limit); batas itu tidak dijamin. Di tier gratis, isi permintaan boleh dipakai Google untuk meningkatkan produknya, jadi jangan kirim data sensitif (nama makanan aman). Tier berbayar baru berlaku kalau kamu menautkan akun penagihan di AI Studio. Satu pencarian makanan baru memakai sekitar ratusan token, jadi kalau suatu saat berbayar pun biayanya sangat kecil.
