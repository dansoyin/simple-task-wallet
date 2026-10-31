# Task Wallet v4 — Life OS

Task Wallet v4 adalah ruang kendali pribadi untuk tugas, kebiasaan, kesehatan, belajar full-stack & AI, keuangan, dan evaluasi bulanan. Semuanya dicatat **secepat ngetik chat di WhatsApp**.

> Ketik `nyetrika baju besok`, `belajar Node.js 45 menit`, `olahraga`, `kopi 18rb`, atau `ide aplikasi jurnal kesehatan`. Task Wallet menebak jenisnya dan menyimpannya di tempat yang benar. Tidak perlu isi form.

- Bahasa Indonesia, zona waktu **Asia/Jakarta (WIB)**, format **Rupiah**.
- **Local-first:** semua data tersimpan di browser perangkatmu. Tidak ada server, akun, atau pelacakan.
- **PWA:** bisa dipasang di layar utama HP dan dibuka tanpa internet.

---

## 1. Cara membuka

**Paling cepat (laptop):** ekstrak ZIP, lalu klik dua kali `index.html`. Bisa dibuka di Chrome, Edge, atau Firefox.

**Agar bisa dipasang di HP dan jalan offline**, aplikasi harus dibuka lewat `https://` (lihat Deployment). Setelah itu:

- **Android (Chrome):** menu ⋮ → *Tambahkan ke layar utama*, atau ⚙️ Pengaturan → *Pasang sebagai aplikasi*.
- **iPhone (Safari):** tombol Bagikan → *Tambah ke Layar Utama*.

**Menjalankan server lokal** (opsional, untuk mencoba service worker):

```bash
cd v4
python3 -m http.server 8080      # lalu buka http://localhost:8080
# atau: npx serve .
```

## 2. Cara pakai (cukup ini)

Kolom ketik di bawah layar selalu ada. Sebelum dikirim, chip di atasnya menunjukkan tebakan jenisnya. Ketuk chip itu kalau tebakannya salah.

| Ketik | Jadinya |
|---|---|
| `Nyetrika baju` | Tugas hari ini, kategori Rumah |
| `Mengerjakan tugas Matematika besok` | Tugas besok, kategori Belajar |
| `rapat 2 jam penting` | Tugas, estimasi 2 jam, prioritas tinggi |
| `Belajar Node.js 45 menit` | Sesi belajar 45 menit → materi **Node.js** di roadmap |
| `Olahraga sore` | Centang kebiasaan **Olahraga** + check-in olahraga hari ini |
| `Ide membuat aplikasi jurnal kesehatan` | Ide (Tugas › Inbox), bisa dijadikan tugas |
| `catatan: hari ini capek` | Catatan umum |
| `Pengeluaran makan siang Rp25.000` / `kopi 18rb` | Pengeluaran, kategori ditebak |
| `gajian +5jt` / `nabung 500rb` | Pemasukan / tabungan (masuk ke target simpanan) |
| `bayar wifi 350rb tiap tgl 5` | Tugas rutin bulanan; saat dicentang, otomatis tercatat sebagai pengeluaran |
| Tempel daftar dari WhatsApp | Setiap baris jadi satu catatan |

Gestur dan pintasan:
- Geser tugas **ke kanan** untuk menandai selesai, **ke kiri** untuk menghapus. Semua aksi bisa dibatalkan dengan **Urungkan**.
- Di laptop, tekan **/** untuk langsung mengetik.

### Halaman

| Halaman | Isi |
|---|---|
| 🏠 **Beranda** | Sapaan & tanggal; **3 prioritas hari ini** (📌 pilih sendiri lewat “Fokus hari ini”); tombol tambah cepat per jenis; ringkasan tugas bulan ini, kebiasaan, kesehatan, belajar, uang, dan status evaluasi |
| ✅ **Tugas** | Tab *Hari ini* (dengan strip minggu), *Mendatang* (target minggu/bulan, tugas terjadwal, tugas rutin), *Inbox* (tanpa tanggal + ide & catatan), *Selesai*, dan *Kalender* (mingguan/bulanan). Bisa dicari dan difilter per kategori & prioritas. Setiap tugas punya prioritas, kategori, tanggal/jam, estimasi waktu, catatan, dan nominal opsional |
| 🌱 **Kebiasaan & Sehat** | Check-in harian (tidur, olahraga, aktivitas, energi, makan, air, rawat diri, catatan) dan daftar kebiasaan pilihan sendiri. Perkembangan ditampilkan sebagai **“x dari y hari”** dan **% konsistensi**, mingguan & bulanan, bukan streak |
| 📚 **Belajar** | *Roadmap* 19 materi full-stack & AI (status, catatan, tautan, jumlah sesi, durasi, tugas & proyek terkait); *Sesi belajar* (topik, durasi, yang dipelajari, yang belum dipahami, langkah berikutnya, bisa dijadikan tugas); *Proyek* (proof of work: masalah, pengguna, teknologi, fitur, GitHub, demo, kendala, pelajaran, screenshot) |
| 💰 **Uang** | Pengeluaran bulan ini, pemasukan, saldo bersih, tabungan, anggaran dengan “aman Rp…/hari”, target simpanan, tagihan mendatang, grafik per hari, kategori terbesar, riwayat yang bisa dicari |
| 🗓️ **Evaluasi** | Angka otomatis (tugas & %, sesi & durasi belajar, hari olahraga, konsistensi kebiasaan, pemasukan, pengeluaran, saldo bersih, tugas yang sering tertunda). Ada 7 pertanyaan refleksi dan tombol **Isi template otomatis**. Jawaban tersimpan otomatis |

## 3. Struktur folder

```
v4/
├── index.html              # kerangka halaman (header, navigasi, kolom ketik)
├── manifest.webmanifest    # identitas PWA (nama, ikon, warna, shortcut)
├── sw.js                   # service worker: cache offline + klik notifikasi
├── css/app.css             # semua gaya; token warna terang/gelap di :root
├── js/
│   ├── util.js             # tanggal (WIB), format Rupiah, helper kecil
│   ├── parser.js           # bahasa sehari-hari → tugas/kebiasaan/belajar/uang/ide
│   ├── store.js            # lapisan data: skema, simpan, migrasi, mesin tugas rutin, modul hidup
│   ├── life.js             # halaman Beranda, Kebiasaan & Sehat, Belajar, Evaluasi
│   └── app.js              # shell: navigasi, render, kolom ketik, Tugas & Uang, sheet, swipe, pengingat
├── icons/                  # ikon PWA (svg + png)
├── tests/
│   ├── unit.test.js        # tes data & migrasi (tanpa dependensi): node tests/unit.test.js
│   └── e2e.js              # tes browser 28 skenario (playwright-core)
├── README.md · CHANGELOG.md · TESTING.md
```

Urutan muat script penting: `util → parser → store → life → app`. Tidak ada build step, tidak ada `import`/module (supaya tetap bisa dibuka langsung dari file).

## 4. Deployment

Situs statis, jadi cukup unggah isi folder `v4`.

**Cloudflare Pages (disarankan: domain lama `task-wallet.pages.dev`):**
1. Dashboard Cloudflare → Pages → proyek `task-wallet` → *Create deployment* → unggah **isi** folder `v4` (bukan foldernya).
   Kalau proyeknya terhubung ke GitHub: set *Build command* kosong dan *Build output directory* `v4`.
2. Buka `https://task-wallet.pages.dev/` di HP. **Data lama di domain itu (`todos`, `finance_transactions`, `finance_savingsGoal`) otomatis dipindahkan pada pembukaan pertama.** Data aslinya tidak dihapus.

**GitHub Pages:** push repo, lalu *Settings → Pages → Deploy from branch* (`main`, folder root). Aplikasi akan ada di `https://<user>.github.io/<repo>/v4/`.

> localStorage terikat ke **alamat** situs. Data di `task-wallet.pages.dev` dan di `github.io` tidak saling terlihat, begitu juga data di file lokal. Pakai satu alamat utama. Untuk pindah perangkat atau alamat, gunakan ⚙️ → **Backup data** lalu **Pulihkan dari file backup**.

Setiap kali merilis perubahan, naikkan `CACHE` di `sw.js` (misalnya `task-wallet-v4.0.1`). Pengguna akan mendapat versi baru pada pembukaan berikutnya.

## 5. Data, privasi & migrasi

- Data disimpan di `localStorage` dengan key **`taskwallet.v4`**. Pengaturan tampilan disimpan di `taskwallet.ui`.
- **Migrasi otomatis pada pembukaan pertama**, tanpa menghapus apa pun:
  - Task Wallet lama: `todos`, `finance_transactions`, `finance_savingsGoal`.
  - Catetin v2/v3: `catetin.v2`.
  - Build “task-wallet-revamp”: `task_wallet_v2_state`, termasuk evaluasinya.
  - Duplikat (data lama yang sama di beberapa versi) dideteksi lewat id lamanya.
  - Key lama dibiarkan apa adanya, sehingga sekaligus menjadi cadangan.
- Kalau data tidak bisa dibaca (rusak), data itu **tidak ditimpa**. Salinannya disimpan sebagai `taskwallet.v4.rusak-<waktu>`.
- **Ekspor dan impor:**
  - ⚙️ → *Backup data* menghasilkan file JSON. Di HP, file bisa langsung dikirim ke WhatsApp/Drive.
  - ⚙️ → *Pulihkan dari file backup* menerima file v4, v2/v3, dan file ekspor versi lama.
  - ⚙️ → *Ekspor transaksi (.csv)* untuk Excel atau Google Sheets.
- Aplikasi mengingatkan untuk backup tiap 2 minggu dan meminta browser (`navigator.storage.persist`) agar data tidak dihapus otomatis.
- Data kesehatan dan keuangan **tidak dikirim ke mana pun**. Check-in kesehatan hanyalah catatan kebiasaan, bukan alat medis. Aplikasi tidak memberi diagnosis atau saran keuangan.

## 6. Analisis versi lama (task-wallet.pages.dev)

Versi lama yang terpasang identik dengan `index.html`, `todo.html`, dan `finance.html` di root repo ini.

**UX:**
- Tugas dan keuangan ada di dua halaman terpisah, dan untuk berpindah harus lewat halaman beranda.
- Mencatat butuh banyak isian: judul, nominal, pilih kategori, tanggal, prioritas. Akibatnya kalah praktis dari Draft WhatsApp.
- Tidak ada tampilan per hari/minggu/bulan, tugas rutin, kebiasaan, atau evaluasi.
- Bahasa default Inggris, dan tampilan HP belum diutamakan.

**Teknis:**
- Dua file JS besar tanpa pemisahan data dan tampilan, serta tema dan bahasa ganda di masing-masing.
- `id` memakai `Date.now()`.
- Tanggal memakai `toISOString()` (UTC), sehingga bisa meleset sehari di WIB.
- Filter kategori memecah id `other-expense` dengan `split('-')`, sehingga kategori “Lainnya” tidak pernah cocok.
- Ada handler `onclick` inline.
- Tidak ada PWA atau offline, impor bisa menimpa data tanpa konfirmasi, dan tidak ada migrasi.

## 7. Belajar dari kode ini

Bagian yang paling layak dipelajari, beserta konsep yang dipakai:

| File / fungsi | Konsep |
|---|---|
| `util.js` → `wibParts`, `keyAt` | Zona waktu dengan `Intl.DateTimeFormat`. Tanggal disimpan sebagai string `YYYY-MM-DD` agar bebas bug UTC |
| `parser.js` → `Scanner.take` | Tokenizer sederhana: pola dicocokkan lalu bagian yang sudah dipakai “dikosongkan”, dan sisanya menjadi judul. Urutan pola penting (durasi sebelum jam, jam sebelum uang) |
| `parser.js` → `resolve` | Satu input ditafsirkan berbeda menurut konteks. `tgl 5` untuk tugas berarti ke depan, untuk transaksi berarti ke belakang |
| `store.js` → `storage` | **Adapter pattern.** Hanya satu objek yang menyentuh `localStorage`, jadi bisa diganti dengan API |
| `store.js` → `sanitize`, `migrateOld` | Validasi skema dan migrasi data yang aman (tidak destruktif, idempoten, deteksi duplikat) |
| `store.js` → `occursOn`, `normalizeRepeat` | Mesin pengulangan (harian/mingguan/bulanan/tahunan, “tiap 2 minggu”, “akhir bulan”) tanpa library |
| `app.js` → `ACTIONS` + `data-act` | **Event delegation**: satu listener untuk ribuan tombol, tanpa `onclick` inline |
| `app.js` → `render()` | Render ulang dari state (pola yang nanti terasa familiar di React), sambil mempertahankan fokus input |
| `app.js` → `snapshot`/`undo` | Undo berbasis snapshot state |
| `sw.js` | Service worker *stale-while-revalidate* |
| `tests/` | Unit test tanpa framework (`node:assert`) dan tes end-to-end dengan Playwright |

## 8. Menuju full-stack (rencana berikutnya)

Struktur data sudah disiapkan untuk naik kelas menjadi aplikasi dengan server:

1. **Backend Node.js + Express** dengan REST API, misalnya:

   ```
   POST /api/auth/register · POST /api/auth/login        (bcrypt + JWT/session cookie)
   GET/POST/PATCH/DELETE /api/tasks, /api/transactions, /api/habits, /api/habit-logs,
                         /api/health/:date, /api/topics, /api/sessions, /api/projects, /api/reviews/:month
   GET  /api/sync?since=<timestamp>   ·   POST /api/sync   (kirim perubahan offline)
   ```

2. **PostgreSQL/MySQL:** setiap array di `taskwallet.v4` (`tasks`, `txns`, `habits`, `sessions`, …) menjadi satu tabel dengan kolom `user_id`, `updated_at`, dan `deleted_at` (soft delete untuk sinkronisasi).
3. **Sinkronisasi:** ganti objek `storage` di `store.js` dengan adapter yang menyimpan ke localStorage (offline) lalu mengirim antrean perubahan ke `/api/sync`. Untuk tahap awal, konflik diselesaikan dengan *last write wins* berdasarkan `updatedAt`.
4. **Deployment:** frontend tetap di Cloudflare Pages; API di Railway/Render/Fly.io atau Cloudflare Workers; database di Neon/Supabase.

### Tentang AI Assistant
Versi ini **sengaja belum memakai AI**, dan tidak ada tombol AI palsu. Alasannya: API key **tidak boleh** ditaruh di frontend statis. Yang sudah ada tanpa AI:
- Parser yang mengubah catatan acak menjadi tugas.
- Penanda tugas yang **sering tertunda**.
- Template evaluasi otomatis dari data.
- Tombol “jadikan langkah berikutnya sebagai tugas”.

Cara menambahkan AI nanti (setelah backend ada):
- Endpoint `POST /api/ai/:aksi` (`pecah-tugas`, `rencana-harian`, `rangkum-evaluasi`, `kuis`) memanggil API AI dari server, dengan kunci di environment variable (`ANTHROPIC_API_KEY`).
- Hasil AI selalu tampil sebagai **usulan yang harus disetujui**. AI tidak boleh menghapus atau mengubah tugas, transaksi, atau catatan kesehatan secara otomatis.

## 9. Batasan yang perlu diketahui

- **Belum ada sinkron antarperangkat.** Untuk memindahkan data, pakai backup dan pulihkan.
- **Pengingat tugas berjam** (⚙️ → Pengingat) hanya muncul selama aplikasi terbuka atau terpasang dan berjalan. Notifikasi saat browser tertutup butuh push server.
- Data tersimpan per browser. Membersihkan data situs akan menghapusnya, jadi rajin backup.
