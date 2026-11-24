<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
$user = require_login();

$invoiceNo = trim((string) ($_GET['invoice'] ?? ''));
$stmt = db()->prepare('SELECT * FROM transactions WHERE invoice_no = ? LIMIT 1');
$stmt->execute([$invoiceNo]);
$trx = $stmt->fetch();

if (!$trx) {
    http_response_code(404);
    echo 'Struk transaksi tidak ditemukan.';
    exit;
}

$stmtItems = db()->prepare('SELECT * FROM transaction_items WHERE transaction_id = ?');
$stmtItems->execute([(int) $trx['id']]);
$items = $stmtItems->fetchAll();
?>
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Struk <?= e($trx['invoice_no']) ?></title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      .no-print { display: none !important; }
      body { background: #fff; }
      #receipt { border: none !important; box-shadow: none !important; width: 80mm; margin: 0; }
    }
  </style>
</head>
<body class="bg-slate-100 min-h-screen py-8 px-4 flex flex-col items-center">
  <div class="no-print mb-4 flex gap-3">
    <button onclick="window.print()" class="px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded-lg">Cetak Struk</button>
    <a href="index.php" class="px-4 py-2 bg-white border border-slate-300 text-sm font-medium rounded-lg">Kembali ke Kasir</a>
  </div>

  <div id="receipt" class="w-full max-w-xs bg-white border border-slate-200 p-5 font-mono text-xs text-slate-900">
    <div class="text-center border-b border-dashed border-slate-300 pb-3">
      <div class="font-bold text-sm">TOKO KASIRKITA</div>
      <div>Jl. Merdeka No. 45, Indonesia</div>
    </div>

    <div class="py-3 border-b border-dashed border-slate-300 space-y-1">
      <div class="flex justify-between"><span>No</span><span><?= e($trx['invoice_no']) ?></span></div>
      <div class="flex justify-between"><span>Waktu</span><span><?= e($trx['created_at']) ?></span></div>
      <div class="flex justify-between"><span>Kasir</span><span><?= e($trx['cashier_name']) ?></span></div>
      <div class="flex justify-between"><span>Bayar</span><span><?= strtoupper(e($trx['payment_method'])) ?></span></div>
    </div>

    <div class="py-3 border-b border-dashed border-slate-300 space-y-2">
      <?php foreach ($items as $item): ?>
        <div>
          <div class="font-semibold"><?= e($item['product_name']) ?></div>
          <div class="flex justify-between text-slate-600">
            <span><?= (int)$item['qty'] ?> x <?= format_rupiah($item['unit_price']) ?></span>
            <span class="text-slate-900"><?= format_rupiah($item['subtotal']) ?></span>
          </div>
        </div>
      <?php endforeach; ?>
    </div>

    <div class="pt-3 space-y-1">
      <div class="flex justify-between font-bold text-sm">
        <span>TOTAL</span>
        <span><?= format_rupiah($trx['total_amount']) ?></span>
      </div>
      <div class="flex justify-between">
        <span>DIBAYAR</span>
        <span><?= format_rupiah($trx['cash_paid']) ?></span>
      </div>
      <div class="flex justify-between">
        <span>KEMBALIAN</span>
        <span><?= format_rupiah($trx['change_amount']) ?></span>
      </div>
      <?php if (!empty($trx['qris_ref'])): ?>
        <div class="flex justify-between"><span>REF QRIS</span><span><?= e($trx['qris_ref']) ?></span></div>
      <?php endif; ?>
    </div>

    <div class="text-center border-t border-dashed border-slate-300 mt-4 pt-3 text-[11px] text-slate-600">
      Terima kasih telah berbelanja!
    </div>
  </div>
</body>
</html>
