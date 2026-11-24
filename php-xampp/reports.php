<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
$user = require_login();

$date = $_GET['date'] ?? date('Y-m-d');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    $date = date('Y-m-d');
}

$stmt = db()->prepare(
    'SELECT id, invoice_no, cashier_name, payment_method, total_amount, created_at
     FROM transactions
     WHERE DATE(created_at) = ?
     ORDER BY created_at DESC'
);
$stmt->execute([$date]);
$rows = $stmt->fetchAll();

$totalOmzet = 0.0;
$totalCash = 0.0;
$totalQris = 0.0;
foreach ($rows as $r) {
    $amt = (float) $r['total_amount'];
    $totalOmzet += $amt;
    if ($r['payment_method'] === 'cash') $totalCash += $amt;
    else $totalQris += $amt;
}
?>
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Laporan Penjualan Harian — KasirKita POS</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-6">
    <span class="font-bold text-lg tracking-tight">KasirKita POS</span>
    <nav class="flex items-center gap-6 text-sm font-medium text-slate-600">
      <a href="index.php" class="hover:text-slate-900">Kasir</a>
      <a href="inventory.php" class="hover:text-slate-900">Kelola Stok</a>
      <a href="reports.php" class="text-teal-700 font-semibold">Laporan Harian</a>
    </nav>
    <div class="flex items-center gap-3 text-sm">
      <span class="text-slate-600 hidden sm:inline"><?= e($user['full_name']) ?></span>
      <a href="logout.php" class="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium">Keluar</a>
    </div>
  </header>

  <main class="max-w-7xl mx-auto p-6 space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold">Laporan Penjualan Harian</h1>
        <p class="text-sm text-slate-500">Rekap otomatis transaksi harian untuk tanggal <?= e($date) ?></p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <form method="get" class="flex items-center gap-2">
          <input type="date" name="date" value="<?= e($date) ?>" class="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm">
          <button type="submit" class="px-3 py-2 bg-slate-900 text-white text-sm rounded-lg">Tampilkan</button>
        </form>
        <a href="export_excel.php?date=<?= e($date) ?>" class="px-3 py-2 bg-emerald-700 text-white text-sm font-medium rounded-lg">Export Excel</a>
        <a href="export_pdf.php?date=<?= e($date) ?>" target="_blank" class="px-3 py-2 bg-white border border-slate-300 text-sm font-medium rounded-lg">Export PDF</a>
      </div>
    </div>

    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs text-slate-500">Total Penjualan</div>
        <div class="mt-1 font-mono text-xl font-bold"><?= format_rupiah($totalOmzet) ?></div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs text-slate-500">Jumlah Transaksi</div>
        <div class="mt-1 font-mono text-xl font-bold"><?= count($rows) ?></div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs text-slate-500">Total Tunai (Cash)</div>
        <div class="mt-1 font-mono text-xl font-bold"><?= format_rupiah($totalCash) ?></div>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="text-xs text-slate-500">Total QRIS</div>
        <div class="mt-1 font-mono text-xl font-bold"><?= format_rupiah($totalQris) ?></div>
      </div>
    </section>

    <section class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm text-left">
        <thead class="bg-slate-50 border-b border-slate-200 text-slate-600">
          <tr>
            <th class="px-4 py-3">No. Invoice</th>
            <th class="px-4 py-3">Waktu</th>
            <th class="px-4 py-3">Kasir</th>
            <th class="px-4 py-3">Metode</th>
            <th class="px-4 py-3 text-right">Total</th>
            <th class="px-4 py-3 text-right">Struk</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <?php if (count($rows) === 0): ?>
            <tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">Belum ada transaksi pada tanggal ini.</td></tr>
          <?php endif; ?>
          <?php foreach ($rows as $r): ?>
            <tr>
              <td class="px-4 py-3 font-mono text-xs"><?= e($r['invoice_no']) ?></td>
              <td class="px-4 py-3 font-mono text-xs text-slate-600"><?= e($r['created_at']) ?></td>
              <td class="px-4 py-3"><?= e($r['cashier_name']) ?></td>
              <td class="px-4 py-3 uppercase text-xs font-semibold"><?= e($r['payment_method']) ?></td>
              <td class="px-4 py-3 text-right font-mono font-semibold"><?= format_rupiah($r['total_amount']) ?></td>
              <td class="px-4 py-3 text-right">
                <a href="receipt.php?invoice=<?= e($r['invoice_no']) ?>" class="text-teal-700 hover:underline text-xs font-medium">Cetak Struk</a>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>
