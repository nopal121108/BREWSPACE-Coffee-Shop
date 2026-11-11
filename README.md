# BREWSPACE – Coffee Shop Management System (Next.js Edition)

Sistem manajemen coffee shop modern, minimalis, dan profesional yang dirancang dengan **Next.js 14 (App Router)**, **React**, **Tailwind CSS**, dan **SQLite Native (Node 22+)**. Mengelola seluruh aspek operasional coffee shop, mulai dari kasir (Point of Sale), manajemen menu & produk, inventaris stok & log mutasi bahan, hingga analisis laporan omzet penjualan.

---

## 🎨 Konsep Desain & Palet Warna

Aplikasi ini menggunakan konsep **Modern Minimalist Coffee Shop** dengan perpaduan warna hangat yang menenangkan dan profesional:
- **Warm Cream**: `#F5F0E8` (Latar belakang utama)
- **Coffee Brown**: `#6F4E37` (Aksen tombol, ikon, & penanda aktif)
- **Dark Espresso**: `#30231D` (Sidebar navigasi, teks judul, & elemen kontras)
- **White**: `#FFFFFF` (Card kontainer, modal dialog, & tabel)
- **Light Beige**: `#E8DFD2` (Border halus, hover state, & tag kategori)
- **Caramel & Gold**: `#C68B59` & `#D4A373` (Badge & aksen pendukung)

Font yang digunakan adalah **Poppins** (untuk heading & penekanan) dan **Inter** (untuk keterbacaan data & angka tabular).

---

## 👥 Akun & Hak Akses (Role-Based Access Control)

Sistem membedakan dua hak akses dengan proteksi antarmuka (frontend) dan API route handlers (backend):

| Role | Username | Password | Deskripsi Hak Akses |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Akses penuh: Dashboard, Produk, Kategori, Stok & Audit, Transaksi, Laporan Omzet, Pengguna, & Pengaturan. |
| **Kasir** | `kasir` | `kasir123` | Khusus operasional POS: katalog menu, input keranjang, kalkulasi kembalian otomatis, cetak struk thermal, dan riwayat transaksi shift pribadi. |
| **Kasir 2** | `kasir2` | `kasir123` | Akun kasir kedua untuk pengujian multi-user. |

---

## 🚀 Fitur Utama Next.js

1. **Point of Sale (POS) Kasir (`/pos`)**:
   - Filter instan kategori menu (Signature Coffee, Classic Espresso, Manual Brew, Non-Coffee, Pastry, Main Course).
   - Keranjang interaktif dengan manajemen kuantitas (+/-) dan kalkulasi otomatis.
   - Quick Cash Button (Uang Pas, 50k, 100k, 200k) & kalkulator uang kembalian real-time.
   - Cetak struk belanja thermal 80mm / 58mm dengan tombol cetak siap pakai (`window.print()`).
2. **Dashboard Analitik Admin (`/dashboard`)**:
   - Kartu metrik: Total Omzet, Total Transaksi, Menu Aktif, dan Peringatan Stok.
   - Grafik tren penjualan harian (real-time).
   - Top 5 produk terlaris & feed transaksi terbaru.
3. **Manajemen Produk & Kategori (`/products`, `/categories`)**:
   - Tambah, edit, dan toggle status aktif produk dan kategori.
   - Otomatis generator visual SVG kopi untuk setiap menu.
4. **Manajemen Stok & Audit Mutasi (`/inventory`)**:
   - Restock cepat dan koreksi stok manual (opname).
   - Log jejak mutasi lengkap mencatat penjualan kasir, restock, dan koreksi per unit.
5. **Riwayat Transaksi & Laporan Omzet (`/transactions`, `/reports`)**:
   - Riwayat transaksi terpusat dengan filter tanggal & pencarian invoice.
   - Laporan omzet dengan filter periode (Hari Ini, Kemarin, 7 Hari Terakhir, Bulan Ini) serta Average Order Value (AOV).
6. **Manajemen Pengguna & Pengaturan Toko (`/users`, `/settings`)**:
   - Kelola staf kasir dan admin.
   - Kustomisasi profil toko, persentase pajak (PB1), dan footer struk.

---

## 💻 Cara Menjalankan Aplikasi

Pastikan **Node.js** telah terinstal di komputer Anda.

### Menjalankan Server Development:
Cukup klik ganda file **`start.bat`** atau **`dev.bat`**, atau jalankan perintah di terminal:

```bash
cd C:\Users\USER\.gemini\antigravity\scratch\brewspace
npm run dev
```

Buka browser dan akses:
```
http://localhost:3000
```
