<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
$user = require_login();

$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verify_csrf($_POST['csrf_token'] ?? null)) {
        $error = 'Token keamanan tidak valid.';
    } else {
        $action = $_POST['action'] ?? '';
        if ($action === 'add') {
            $sku = trim((string) ($_POST['sku'] ?? ''));
            $name = trim((string) ($_POST['name'] ?? ''));
            $category = trim((string) ($_POST['category'] ?? 'Umum'));
            $buyPrice = max(0.0, (float) ($_POST['buy_price'] ?? 0));
            $sellPrice = max(0.0, (float) ($_POST['sell_price'] ?? 0));
            $stock = max(0, (int) ($_POST['stock'] ?? 0));
            $minStock = max(0, (int) ($_POST['min_stock'] ?? 5));
            $unit = trim((string) ($_POST['unit'] ?? 'pcs')) ?: 'pcs';

            try {
                $stmt = db()->prepare(
                    'INSERT INTO products (sku, name, category, buy_price, sell_price, stock, min_stock, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                );
                $stmt->execute([$sku, $name, $category, $buyPrice, $sellPrice, $stock, $minStock, $unit]);
                $message = 'Barang baru berhasil ditambahkan.';
            } catch (Throwable $e) {
                $error = 'Gagal menambah barang (pastikan kode SKU belum digunakan).';
            }
        } elseif ($action === 'update_stock') {
            $id = (int) ($_POST['id'] ?? 0);
            $stock = max(0, (int) ($_POST['stock'] ?? 0));
            $sellPrice = max(0.0, (float) ($_POST['sell_price'] ?? 0));
            $stmt = db()->prepare('UPDATE products SET stock = ?, sell_price = ? WHERE id = ?');
            $stmt->execute([$stock, $sellPrice, $id]);
            $message = 'Stok dan harga barang diperbarui.';
        } elseif ($action === 'delete') {
            $id = (int) ($_POST['id'] ?? 0);
            $stmt = db()->prepare('DELETE FROM products WHERE id = ?');
            $stmt->execute([$id]);
            $message = 'Barang berhasil dihapus dari katalog.';
        }
    }
}

$filter = $_GET['filter'] ?? 'all';
$sql = 'SELECT id, sku, name, category, buy_price, sell_price, stock, min_stock, unit FROM products';
if ($filter === 'low') {
    $sql .= ' WHERE stock <= min_stock';
}
$sql .= ' ORDER BY stock ASC, name ASC';
$products = db()->query($sql)->fetchAll();
$lowCount = count(get_low_stock_products());
?>
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kelola Stok Barang — KasirKita POS</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-6">
    <span class="font-bold text-lg tracking-tight">KasirKita POS</span>
    <nav class="flex items-center gap-6 text-sm font-medium text-slate-600">
      <a href="index.php" class="hover:text-slate-900">Kasir</a>
      <a href="inventory.php" class="text-teal-700 font-semibold">Kelola Stok</a>
      <a href="reports.php" class="hover:text-slate-900">Laporan Harian</a>
    </nav>
    <div class="flex items-center gap-3 text-sm">
      <span class="text-slate-600 hidden sm:inline"><?= e($user['full_name']) ?></span>
      <a href="logout.php" class="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium">Keluar</a>
    </div>
  </header>

  <main class="max-w-7xl mx-auto p-6 space-y-6">
    <?php if ($lowCount > 0): ?>
      <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
        <strong>Notifikasi Stok Menipis:</strong> Ada <?= $lowCount ?> barang dengan persediaan sama atau di bawah batas minimum.
      </div>
    <?php endif; ?>

    <?php if ($message): ?>
      <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800"><?= e($message) ?></div>
    <?php endif; ?>
    <?php if ($error): ?>
      <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"><?= e($error) ?></div>
    <?php endif; ?>

    <section class="bg-white border border-slate-200 rounded-xl p-5">
      <h2 class="font-bold text-base mb-4">Tambah Barang Baru</h2>
      <form method="post" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="add">
        <input name="sku" required placeholder="Kode SKU (mis. BRG-011)" class="px-3 py-2 border border-slate-300 rounded-lg">
        <input name="name" required placeholder="Nama Barang" class="px-3 py-2 border border-slate-300 rounded-lg">
        <input name="category" required placeholder="Kategori (Minuman/Snack)" class="px-3 py-2 border border-slate-300 rounded-lg">
        <input name="unit" value="pcs" placeholder="Satuan (pcs/botol)" class="px-3 py-2 border border-slate-300 rounded-lg">
        <input name="buy_price" type="number" min="0" required placeholder="Harga Beli (Rp)" class="px-3 py-2 border border-slate-300 rounded-lg">
        <input name="sell_price" type="number" min="0" required placeholder="Harga Jual (Rp)" class="px-3 py-2 border border-slate-300 rounded-lg">
        <input name="stock" type="number" min="0" required placeholder="Stok Awal" class="px-3 py-2 border border-slate-300 rounded-lg">
        <input name="min_stock" type="number" min="0" value="5" required placeholder="Batas Notifikasi Stok" class="px-3 py-2 border border-slate-300 rounded-lg">
        <div class="sm:col-span-2 lg:col-span-4 flex justify-end">
          <button type="submit" class="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg">Simpan Barang</button>
        </div>
      </form>
    </section>

    <section class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between">
        <h2 class="font-bold text-base">Daftar Stok Barang</h2>
        <div class="flex gap-2 text-xs">
          <a href="inventory.php" class="px-3 py-1.5 rounded-lg border <?= $filter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300' ?>">Semua</a>
          <a href="inventory.php?filter=low" class="px-3 py-1.5 rounded-lg border <?= $filter === 'low' ? 'bg-amber-600 text-white border-amber-600' : 'border-slate-300' ?>">Stok Menipis (<?= $lowCount ?>)</a>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th class="px-4 py-3">SKU</th>
              <th class="px-4 py-3">Nama Barang</th>
              <th class="px-4 py-3">Kategori</th>
              <th class="px-4 py-3 text-right">Harga Jual</th>
              <th class="px-4 py-3 text-right">Stok</th>
              <th class="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <?php foreach ($products as $p): ?>
              <tr>
                <td class="px-4 py-3 font-mono text-xs"><?= e($p['sku']) ?></td>
                <td class="px-4 py-3 font-medium">
                  <?= e($p['name']) ?>
                  <?php if ((int)$p['stock'] <= (int)$p['min_stock']): ?>
                    <span class="block text-xs text-amber-700">Stok hampir habis (batas min: <?= (int)$p['min_stock'] ?>)</span>
                  <?php endif; ?>
                </td>
                <td class="px-4 py-3 text-slate-600"><?= e($p['category']) ?></td>
                <td class="px-4 py-3 text-right font-mono"><?= format_rupiah($p['sell_price']) ?></td>
                <td class="px-4 py-3 text-right font-mono"><?= (int)$p['stock'] ?> <?= e($p['unit']) ?></td>
                <td class="px-4 py-3 text-right">
                  <form method="post" class="inline-flex items-center gap-2">
                    <input type="hidden" name="csrf_token" value="<?= e(csrf_token()) ?>">
                    <input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
                    <input type="hidden" name="sell_price" value="<?= (float)$p['sell_price'] ?>">
                    <input type="number" name="stock" value="<?= (int)$p['stock'] ?>" min="0" class="w-16 px-2 py-1 border border-slate-300 rounded text-xs font-mono">
                    <button name="action" value="update_stock" class="px-2.5 py-1 border border-slate-300 rounded text-xs hover:bg-slate-100">Update</button>
                    <button name="action" value="delete" onclick="return confirm('Hapus barang ini?')" class="px-2.5 py-1 border border-red-200 text-red-700 rounded text-xs hover:bg-red-50">Hapus</button>
                  </form>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</body>
</html>
