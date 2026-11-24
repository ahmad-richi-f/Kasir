<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_login();

$date = $_GET['date'] ?? date('Y-m-d');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    $date = date('Y-m-d');
}

$stmt = db()->prepare(
    'SELECT invoice_no, created_at, cashier_name, payment_method, subtotal, discount, total_amount
     FROM transactions
     WHERE DATE(created_at) = ?
     ORDER BY created_at ASC'
);
$stmt->execute([$date]);
$rows = $stmt->fetchAll();

header('Content-Type: application/vnd.ms-excel; charset=utf-8');
header('Content-Disposition: attachment; filename="laporan-penjualan-' . $date . '.xls"');
echo "\xEF\xBB\xBF";
?>
<table border="1">
  <thead>
    <tr>
      <th colspan="7">LAPORAN PENJUALAN HARIAN KASIRKITA — <?= e($date) ?></th>
    </tr>
    <tr>
      <th>No. Invoice</th>
      <th>Waktu</th>
      <th>Kasir</th>
      <th>Metode</th>
      <th>Subtotal</th>
      <th>Diskon</th>
      <th>Total</th>
    </tr>
  </thead>
  <tbody>
    <?php $grand = 0.0; foreach ($rows as $r): $grand += (float)$r['total_amount']; ?>
      <tr>
        <td><?= e($r['invoice_no']) ?></td>
        <td><?= e($r['created_at']) ?></td>
        <td><?= e($r['cashier_name']) ?></td>
        <td><?= strtoupper(e($r['payment_method'])) ?></td>
        <td><?= (float)$r['subtotal'] ?></td>
        <td><?= (float)$r['discount'] ?></td>
        <td><?= (float)$r['total_amount'] ?></td>
      </tr>
    <?php endforeach; ?>
    <tr>
      <th colspan="6">GRAND TOTAL</th>
      <th><?= $grand ?></th>
    </tr>
  </tbody>
</table>
