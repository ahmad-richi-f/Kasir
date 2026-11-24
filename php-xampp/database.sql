-- KasirKita POS — Database Schema untuk phpMyAdmin / MySQL (XAMPP)
-- Impor file ini melalui tab "Import" di http://localhost/phpmyadmin

CREATE DATABASE IF NOT EXISTS `db_kasir_kita`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `db_kasir_kita`;

-- 1. Tabel Karyawan / Pengguna Kasir
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'kasir') NOT NULL DEFAULT 'kasir',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Barang & Stok
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `category` VARCHAR(60) NOT NULL DEFAULT 'Umum',
  `buy_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `sell_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `min_stock` INT NOT NULL DEFAULT 5,
  `unit` VARCHAR(20) NOT NULL DEFAULT 'pcs',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_sku` (`sku`),
  KEY `idx_products_category` (`category`),
  KEY `idx_products_stock` (`stock`, `min_stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Transaksi Penjualan
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `invoice_no` VARCHAR(40) NOT NULL,
  `user_id` INT UNSIGNED NULL,
  `cashier_name` VARCHAR(100) NOT NULL,
  `payment_method` ENUM('cash', 'qris') NOT NULL DEFAULT 'cash',
  `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `cash_paid` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `change_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `qris_ref` VARCHAR(64) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_transactions_invoice` (`invoice_no`),
  KEY `idx_transactions_date` (`created_at`),
  CONSTRAINT `fk_transactions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Detail Item Transaksi
CREATE TABLE IF NOT EXISTS `transaction_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `transaction_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NULL,
  `sku` VARCHAR(40) NOT NULL,
  `product_name` VARCHAR(120) NOT NULL,
  `qty` INT NOT NULL,
  `unit_price` DECIMAL(12, 2) NOT NULL,
  `subtotal` DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_items_transaction` (`transaction_id`),
  CONSTRAINT `fk_items_transaction`
    FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data Awal Produk Toko (Termasuk contoh barang stok menipis untuk uji notifikasi)
INSERT INTO `products` (`sku`, `name`, `category`, `buy_price`, `sell_price`, `stock`, `min_stock`, `unit`) VALUES
('BRG-001', 'Kopi Susu Gula Aren 250ml', 'Minuman', 11000.00, 18000.00, 28, 8, 'botol'),
('BRG-002', 'Teh Melati Dingin 350ml', 'Minuman', 4500.00, 8000.00, 42, 10, 'botol'),
('BRG-003', 'Air Mineral 600ml', 'Minuman', 2200.00, 4000.00, 65, 15, 'botol'),
('BRG-004', 'Roti Bakar Cokelat Keju', 'Makanan', 9500.00, 15000.00, 4, 6, 'porsi'),
('BRG-005', 'Croissant Mentega Klasik', 'Makanan', 12000.00, 20000.00, 14, 5, 'pcs'),
('BRG-006', 'Keripik Singkong Balado 150g', 'Snack', 7500.00, 12500.00, 3, 8, 'bungkus'),
('BRG-007', 'Biskuit Gandum Cokelat', 'Snack', 6000.00, 10000.00, 20, 6, 'pack'),
('BRG-008', 'Beras Pandan Wangi 5kg', 'Sembako', 64000.00, 74500.00, 9, 4, 'karung'),
('BRG-009', 'Minyak Goreng Pouch 1L', 'Sembako', 15500.00, 19000.00, 18, 6, 'pouch'),
('BRG-010', 'Gula Pasir Kristal 1kg', 'Sembako', 14000.00, 17500.00, 2, 5, 'pack');
