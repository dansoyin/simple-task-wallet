# Catatan perubahan

## v4.0.0 — Task Wallet Life OS

### Baru
- **Navigasi 6 halaman:** Beranda, Tugas, Kebiasaan & Sehat, Belajar, Uang, Evaluasi. Di HP tampil sebagai baris ikon, di laptop sebagai sidebar.
- **Beranda (dashboard):**
  - Sapaan berdasarkan jam WIB dan tanggal.
  - 3 prioritas hari ini, bisa dipilih sendiri lewat 📌 *Fokus hari ini*.
  - Tombol tambah cepat per jenis.
  - Ringkasan tugas bulan ini, kebiasaan, kesehatan, belajar, uang, dan status evaluasi.
- **Quick capture 7 jenis:** tugas, kebiasaan, sesi belajar, pengeluaran, pemasukan, ide, catatan.
  - Jenis ditebak dari kalimat (`belajar Node.js 45 menit`, `olahraga sore`, `ide …`, `catatan: …`).
  - Jenis bisa dipilih manual lewat chip.
  - Di halaman Belajar/Kebiasaan, entri polos otomatis menjadi sesi/kebiasaan.
- **Tugas:**
  - Prioritas tinggi/sedang/rendah (`penting`, `!`, `santai`).
  - Kategori pribadi/belajar/kerja/rumah/kesehatan/keuangan, ditebak otomatis.
  - Estimasi waktu (`45 menit`, `1,5 jam`) dan fokus hari ini.
  - Tab Hari ini, Mendatang, Inbox, Selesai, Kalender.
  - Pencarian, filter kategori & prioritas, dan penghitung “sering tertunda”.
- **Ide & catatan** di Inbox, dengan tombol *Jadikan tugas*.
- **Check-in kesehatan harian:** tidur, olahraga, aktivitas fisik, energi, makan, air, rawat diri, catatan. Ringkasan 7 hari dan bulanan. Disertai catatan bahwa ini bukan alat medis.
- **Kebiasaan:**
  - Pilih sendiri dari 10 saran atau tambah sendiri.
  - Perkembangan ditampilkan sebagai “x dari y hari” dan % konsistensi, mingguan & bulanan, tanpa streak.
  - Kalender 30 hari yang bisa diubah.
  - Kebiasaan “Olahraga” tersinkron dengan check-in.
- **Belajar:**
  - Roadmap 19 materi full-stack & AI yang bisa diedit: status, catatan, tautan, kata kunci, jumlah sesi, durasi, tugas & proyek terkait.
  - Sesi belajar: topik, durasi, yang dipelajari, yang belum dipahami, langkah berikutnya → bisa dijadikan tugas.
  - Proyek / proof of work dengan validasi tautan dan screenshot yang dikecilkan otomatis. Task Wallet sudah terisi sebagai proyek pertama.
- **Evaluasi bulanan:**
  - Angka otomatis: tugas & %, sesi & durasi belajar, hari olahraga, konsistensi kebiasaan, pemasukan, pengeluaran, saldo bersih, status.
  - 7 pertanyaan refleksi dan tombol *Isi template otomatis* (hanya mengisi yang kosong).
  - Jawaban tersimpan otomatis.
- **Pengingat tugas berjam:** notifikasi saat jamnya tiba, selama aplikasi terbuka atau terpasang. Klik notifikasi membuka aplikasi.
- **Shortcut PWA:** *Tugas hari ini* dan *Kebiasaan & Sehat* (`?tab=`).

### Diubah
- Semua tanggal dan jam mengikuti **Asia/Jakarta**, apa pun zona waktu perangkatnya.
- Uang:
  - KPI “Saldo bersih”.
  - Pencarian riwayat transaksi bulan ini.
  - Tabungan dipisah dari pengeluaran (melanjutkan v3).
- Data disimpan di key baru `taskwallet.v4`, supaya v2/v3 yang membuka data yang sama tidak menghapus modul baru.

### Migrasi & keamanan data
- Migrasi otomatis pada pembukaan pertama dari `todos`, `finance_transactions`, `finance_savingsGoal`, `catetin.v2`, dan `task_wallet_v2_state`.
- Migrasi bersifat idempoten, menghapus duplikat, dan tidak menghapus key lama.
- Data yang rusak disimpan terpisah, tidak ditimpa.
- Impor file backup yang menimpa data meminta konfirmasi, dan bisa dibatalkan dengan *Urungkan*.

### Tidak disertakan (sengaja)
- **AI Assistant.** Butuh backend agar API key aman. Rencananya ada di README §8.
- **Sinkron antarperangkat.** Butuh server; adapter penyimpanan sudah disiapkan.

## v3.0.0 — Catetin (folder `v3/`)
- Perbaikan: mengedit tugas rutin tidak lagi menghapus riwayat/streak dan tagihan telat.
- Tabungan dipisah dari pengeluaran dan anggaran.
- Target tabungan, pengingat backup, dan backup lewat share sheet.

## v2.0.0 — Catetin (folder `v2/`)
- Satu kolom ketik ala WhatsApp yang mengerti bahasa sehari-hari.
- Tugas harian/mingguan/bulanan dan rutin, keuangan dengan anggaran.
- PWA, swipe, dan urungkan.

## v1 — Task Wallet (root repo, task-wallet.pages.dev)
- Halaman To-Do dan Finance terpisah berbasis form.
