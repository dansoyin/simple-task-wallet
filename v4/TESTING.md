# Hasil pengujian — Task Wallet v4

Diuji pada **31 Oktober 2026** dengan Chromium headless (Playwright), zona waktu `Asia/Jakarta`.
Ukuran layar yang dipakai: HP 390×844 dan 320×640, laptop 1366×820.

## Tes otomatis end-to-end — 28/28 lolos

Jalankan: `python3 -m http.server 8767` di folder `v4`, lalu `node tests/e2e.js http://127.0.0.1:8767/`.
Tes ini butuh `npm i playwright-core` dan Chromium (set env `CHROME=/path/ke/chrome`).

| # | Skenario | Hasil |
|---|---|---|
| 1 | Migrasi otomatis data lama (todos, finance_transactions, finance_savingsGoal) | ✅ |
| 2 | Quick capture: 7 jenis dari kalimat bebas | ✅ |
| 3 | Quick capture: pilih jenis manual (Sesi belajar) | ✅ |
| 4 | Menambah tugas | ✅ |
| 5 | Mengedit tugas (judul, prioritas, kategori, estimasi, fokus) | ✅ |
| 6 | Menandai tugas selesai | ✅ |
| 7 | Filter kategori & prioritas + pencarian | ✅ |
| 8 | Inbox, Selesai, Kalender | ✅ |
| 9 | Ide → jadikan tugas | ✅ |
| 10 | Menghapus tugas (+ urungkan) | ✅ |
| 11 | Check-in kesehatan harian | ✅ |
| 12 | Kebiasaan: centang + konsistensi (bukan streak) | ✅ |
| 13 | Roadmap: ubah status, catatan, tautan | ✅ |
| 14 | Sesi belajar: catat dengan detail | ✅ |
| 15 | Proyek: tambah dengan validasi tautan | ✅ |
| 16 | Pemasukan, pengeluaran & saldo bersih | ✅ |
| 17 | Target simpanan (dari data lama) + progres | ✅ |
| 18 | Cari, edit & hapus transaksi | ✅ |
| 19 | Evaluasi bulanan: angka otomatis + template + simpan otomatis | ✅ |
| 20 | Ekspor data (JSON) & impor kembali | ✅ |
| 21 | Data tetap ada setelah reload | ✅ |
| 22 | Mode gelap | ✅ |
| 23 | Tampilan HP (390px & 320px) tanpa scroll horizontal | ✅ |
| 24 | Tampilan laptop (1366px) | ✅ |
| 25 | Pengingat: tombol aktif hanya bila browser mendukung | ✅ |
| 26 | Tidak ada error JavaScript di console | ✅ |
| 27 | Dibuka langsung dari file (tanpa server) | ✅ |
| 28 | PWA: service worker aktif & manifest dengan ikon | ✅ |

Yang diperiksa di dalam skenario di atas (sesuai daftar validasi wajib):
- **Tugas:** menambah, mengedit (judul, prioritas, kategori, estimasi, fokus), menghapus (dan *Urungkan*), menandai selesai, filter kategori & prioritas, pencarian (fokus input tetap terjaga saat mengetik).
- **Keuangan:** menambah pemasukan & pengeluaran; saldo bersih = pemasukan − pengeluaran bulan ini (dicocokkan dengan perhitungan langsung dari data); target simpanan termasuk migrasi `finance_savingsGoal`; mencari, mengedit, dan menghapus transaksi.
- **Evaluasi bulanan:** angka otomatis tampil, template terisi dari data, jawaban tersimpan otomatis.
- **Ekspor & impor:** backup JSON diunduh, semua data dihapus, lalu dipulihkan dari file. Jumlah tugas dan sesi kembali sama.
- **Mode gelap:** warna latar benar-benar berubah.
- **Tampilan:** HP dan laptop; tidak ada scroll horizontal di 320px pada keenam halaman.
- **Persistensi:** data tetap ada setelah halaman dimuat ulang.
- **Console:** tidak ada error JavaScript sepanjang skenario, termasuk saat dibuka langsung dari file (`file://`).

## Tes unit (tanpa dependensi) — lolos

`node tests/unit.test.js` memeriksa:
- **Migrasi tiga generasi data lama sekaligus:** v1, Catetin v2/v3, dan revamp. Duplikat dihapus, `star` diubah menjadi prioritas tinggi, kategori dan estimasi revamp dipetakan, evaluasi revamp ikut pindah, dan key lama tetap ada.
- **Modul hidup:**
  - Check-in yang mencentang kebiasaan Olahraga.
  - Statistik kebiasaan dan kesehatan.
  - Pencocokan materi (`Node.js`, `express routing` → Express).
  - Sesi yang memindahkan status materi ke *sedang dipelajari*.
  - Metrik evaluasi bulanan.
  - Backup → hapus → pulihkan.

## Pemeriksaan manual / batasan pengujian

Hal-hal ini **tidak bisa diuji otomatis** di lingkungan ini dan perlu dicoba di perangkat asli:
- Pemasangan PWA ke layar utama di Android/iPhone. Manifest, ikon, dan service worker sudah lolos dicek.
- Notifikasi pengingat sungguhan. Logikanya teruji, tapi izin notifikasi dan tampilannya tergantung perangkat.
- Kirim backup lewat share sheet ke WhatsApp/Drive. Di laptop yang dites adalah jalur unduhan file.
- Perilaku keyboard di iOS Safari.
