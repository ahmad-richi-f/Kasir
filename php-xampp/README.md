# KasirKita POS (PHP 8 + MySQL / phpMyAdmin XAMPP)

Aplikasi kasir sederhana berbasis PHP + MySQL (PDO) siap pakai di XAMPP.

## Cara Instalasi di XAMPP

1. **Salin Folder Proyek**
   Ekstrak dan salin seluruh folder ini ke direktori:
   - Windows: `C:\xampp\htdocs\kasir-kita\`
   - macOS: `/Applications/XAMPP/htdocs/kasir-kita/`

2. **Nyalakan Apache & MySQL**
   Buka **XAMPP Control Panel**, lalu klik **Start** pada modul **Apache** dan **MySQL**.

3. **Impor Database di phpMyAdmin**
   - Buka browser ke `http://localhost/phpmyadmin`
   - Klik tab **Import**
   - Pilih file `database.sql` dari folder ini, lalu klik **Go / Kirim**
   - Database `db_kasir_kita` beserta tabel `users`, `products`, `transactions`, dan `transaction_items` akan otomatis dibuat.

4. **Jalankan Aplikasi & Aktivasi Akun Karyawan Pertama**
   - Buka `http://localhost/kasir-kita/`
   - Pada kunjungan pertama, halaman akan otomatis mengarahkan ke `setup.php` untuk membuat akun karyawan/admin pertama dengan hashing `password_hash()`.
   - Setelah aktif, Anda langsung dapat melakukan transaksi Tunai/QRIS, kelola stok, menerima notifikasi stok menipis, mencetak struk, dan mengekspor laporan harian ke Excel/PDF.
