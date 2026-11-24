<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/auth.php';
header('Content-Type: application/json; charset=utf-8');

$user = current_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Sesi berakhir. Silakan login kembali.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metode tidak diizinkan.']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '', true);
if (!is_array($payload) || !verify_csrf($payload['csrf_token'] ?? null)) {
    http_response_code(403);
    echo json_encode(['error' => 'Token keamanan tidak valid.']);
    exit;
}

$items = $payload['items'] ?? [];
$paymentMethod = ($payload['payment_method'] ?? 'cash') === 'qris' ? 'qris' : 'cash';
$discount = max(0.0, (float) ($payload['discount'] ?? 0));
$cashPaid = max(0.0, (float) ($payload['cash_paid'] ?? 0));

if (!is_array($items) || count($items) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Keranjang belanja kosong.']);
    exit;
}

$pdo = db();
try {
    $pdo->beginTransaction();

    $subtotal = 0.0;
    $resolvedItems = [];
    $stmtLock = $pdo->prepare('SELECT id, sku, name, sell_price, stock, min_stock FROM products WHERE id = ? FOR UPDATE');

    foreach ($items as $row) {
        $productId = (int) ($row['product_id'] ?? 0);
        $qty = (int) ($row['qty'] ?? 0);
        if ($productId <= 0 || $qty <= 0) {
            throw new RuntimeException('Data item transaksi tidak valid.');
        }

        $stmtLock->execute([$productId]);
        $product = $stmtLock->fetch();
        if (!$product) {
            throw new RuntimeException('Produk tidak ditemukan.');
        }
        if ((int) $product['stock'] < $qty) {
            throw new RuntimeException('Stok tidak cukup untuk ' . $product['name'] . ' (sisa ' . $product['stock'] . ').');
        }

        $unitPrice = (float) $product['sell_price'];
        $lineTotal = $unitPrice * $qty;
        $subtotal += $lineTotal;

        $resolvedItems[] = [
            'product_id' => (int) $product['id'],
            'sku' => $product['sku'],
            'name' => $product['name'],
            'qty' => $qty,
            'unit_price' => $unitPrice,
            'subtotal' => $lineTotal,
            'new_stock' => (int) $product['stock'] - $qty,
            'min_stock' => (int) $product['min_stock'],
        ];
    }

    $totalAmount = max(0.0, $subtotal - $discount);
    if ($paymentMethod === 'cash' && $cashPaid < $totalAmount) {
        throw new RuntimeException('Nominal uang tunai kurang dari total tagihan.');
    }

    $actualCashPaid = $paymentMethod === 'cash' ? $cashPaid : $totalAmount;
    $changeAmount = $paymentMethod === 'cash' ? ($cashPaid - $totalAmount) : 0.0;
    $invoiceNo = 'INV-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
    $qrisRef = $paymentMethod === 'qris' ? ('QRIS-' . strtoupper(bin2hex(random_bytes(4)))) : null;

    $stmtTrx = $pdo->prepare(
        'INSERT INTO transactions (invoice_no, user_id, cashier_name, payment_method, subtotal, discount, total_amount, cash_paid, change_amount, qris_ref)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmtTrx->execute([
        $invoiceNo,
        (int) $user['id'],
        $user['full_name'],
        $paymentMethod,
        $subtotal,
        $discount,
        $totalAmount,
        $actualCashPaid,
        $changeAmount,
        $qrisRef,
    ]);
    $trxId = (int) $pdo->lastInsertId();

    $stmtItem = $pdo->prepare(
        'INSERT INTO transaction_items (transaction_id, product_id, sku, product_name, qty, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmtStock = $pdo->prepare('UPDATE products SET stock = ? WHERE id = ?');

    $lowStockWarnings = [];
    foreach ($resolvedItems as $item) {
        $stmtItem->execute([
            $trxId,
            $item['product_id'],
            $item['sku'],
            $item['name'],
            $item['qty'],
            $item['unit_price'],
            $item['subtotal'],
        ]);
        $stmtStock->execute([$item['new_stock'], $item['product_id']]);
        if ($item['new_stock'] <= $item['min_stock']) {
            $lowStockWarnings[] = $item['name'] . ' (sisa ' . $item['new_stock'] . ')';
        }
    }

    $pdo->commit();
    echo json_encode([
        'ok' => true,
        'invoice_no' => $invoiceNo,
        'low_stock_warnings' => $lowStockWarnings,
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
