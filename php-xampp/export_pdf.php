<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_login();

$date = $_GET['date'] ?? date('Y-m-d');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    $date = date('Y-m-d');
}

$stmt = db()->prepare(
    'SELECT invoice_no, created_at, cashier_name, payment_method, total_amount
     FROM transactions
     WHERE DATE(created_at) = ?
     ORDER BY created_at ASC'
);
$stmt->execute([$date]);
$rows = $stmt->fetchAll();
$grand = array_reduce($rows, fn($acc, $r) => $acc + (float)$r['total_amount'], 0.0);
?>
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Laporan PDF — <?= e($date) ?></title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="p-8 text-slate-900 bg-white" onload="window.print()">
  <div class="max-w-3xl mx-auto">
    <div class="flex justify-between items-start border-b pb-4 mb-6">
      <div>
        <h1 class="text-xl font-bold">Laporan Penjualan Harian — Toko KasirKita</h1>
        <p class="text-sm text-slate-600">Tanggal Laporan: <?= e($date) ?></p>
      </div>
      <button onclick="window.print()" class="print:hidden px-3 py-1.5 bg-slate-900 text-white text-xs rounded">Simpan PDF / Cetak</button>
    </div>
    <table class="w-full text-sm border-collapse border border-slate-300">
      <thead class="bg-slate-100">
        <tr>
          <th class="border border-slate-300 px-3 py-2 text-left">Invoice</th>
          <th class="border border-slate-300 px-3 py-2 text-left">Waktu</th>
          <th class="border border-slate-300 px-3 py-2 text-left">Kasir</th>
          <th class="border border-slate-300 px-3 py-2 text-left">Metode</th>
          <th class="border border-slate-300 px-3 py-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($rows as $r): ?>
          <tr>
            <td class="border border-slate-300 px-3 py-2 font-mono text-xs"><?= e($r['invoice_no']) ?></td>
            <td class="border border-slate-300 px-3 py-2 font-mono text-xs"><?= e($r['created_at']) ?></td>
            <td class="border border-slate-300 px-3 py-2"><?= e($r['cashier_name']) ?></td>
            <td class="border border-slate-300 px-3 py-2 uppercase text-xs"><?= e($r['payment_method']) ?></td>
            <td class="border border-slate-300 px-3 py-2 text-right font-mono"><?= format_rupiah($r['total_amount']) ?></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
      <tfoot>
        <tr class="font-bold bg-slate-50">
          <td colspan="4" class="border border-slate-300 px-3 py-2 text-right">Total Omzet Harian</td>
          <td class="border border-slate-300 px-3 py-2 text-right font-mono"><?= format_rupiah($grand) ?></td>
        </tr>
      </tfoot>
    </table>
  </div>
</body>
</html>
