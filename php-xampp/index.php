<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
$user = require_login();

$products = db()->query('SELECT id, sku, name, category, sell_price, stock, min_stock, unit FROM products ORDER BY name ASC')->fetchAll();
$lowStockItems = get_low_stock_products();
$csrf = csrf_token();
?>
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Terminal Kasir — KasirKita POS</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 text-slate-900 min-h-screen">
  <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-6">
    <span class="font-bold text-lg tracking-tight">KasirKita POS</span>
    <nav class="flex items-center gap-6 text-sm font-medium text-slate-600">
      <a href="index.php" class="text-teal-700 font-semibold">Kasir</a>
      <a href="inventory.php" class="hover:text-slate-900">Kelola Stok</a>
      <a href="reports.php" class="hover:text-slate-900">Laporan Harian</a>
    </nav>
    <div class="flex items-center gap-3 text-sm">
      <span class="text-slate-600 hidden sm:inline"><?= e($user['full_name']) ?> (<?= e($user['role']) ?>)</span>
      <a href="logout.php" class="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-100">Keluar</a>
    </div>
  </header>

  <?php if (count($lowStockItems) > 0): ?>
    <div class="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
      <span><strong>Peringatan Stok Menipis:</strong> <?= count($lowStockItems) ?> barang hampir habis (<?= e(implode(', ', array_map(fn($x) => $x['name'] . ' sisa ' . $x['stock'], array_slice($lowStockItems, 0, 3)))) ?>).</span>
      <a href="inventory.php?filter=low" class="underline font-medium">Lihat di Kelola Stok</a>
    </div>
  <?php endif; ?>

  <main class="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
    <section class="lg:col-span-7 space-y-4">
      <input id="searchBox" type="search" placeholder="Cari nama barang atau SKU..." class="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm">
      <div id="productGrid" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <?php foreach ($products as $p): ?>
          <button
            type="button"
            onclick='addToCart(<?= (int)$p['id'] ?>)'
            data-search="<?= e(strtolower($p['name'] . ' ' . $p['sku'] . ' ' . $p['category'])) ?>"
            <?= (int)$p['stock'] <= 0 ? 'disabled' : '' ?>
            class="product-card text-left bg-white border border-slate-200 rounded-lg p-4 hover:border-teal-600 transition disabled:opacity-50"
          >
            <div class="text-xs text-slate-500"><?= e($p['sku']) ?> · <?= e($p['category']) ?></div>
            <div class="font-semibold text-sm mt-1 truncate"><?= e($p['name']) ?></div>
            <div class="mt-3 flex items-baseline justify-between">
              <span class="font-mono font-bold text-teal-700"><?= format_rupiah($p['sell_price']) ?></span>
              <span class="text-xs <?= (int)$p['stock'] <= (int)$p['min_stock'] ? 'text-amber-700 font-semibold' : 'text-slate-500' ?>">
                Stok: <?= (int)$p['stock'] ?> <?= e($p['unit']) ?>
              </span>
            </div>
          </button>
        <?php endforeach; ?>
      </div>
    </section>

    <section class="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-fit">
      <div>
        <h2 class="font-bold text-base">Keranjang Transaksi</h2>
        <div id="cartList" class="mt-4 divide-y divide-slate-100 text-sm"></div>
      </div>

      <div class="mt-6 pt-4 border-t border-slate-200 space-y-4">
        <div class="flex justify-between text-sm">
          <span class="text-slate-600">Total Tagihan</span>
          <span id="totalText" class="font-mono text-lg font-bold">Rp 0</span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button type="button" id="btnCash" onclick="setMethod('cash')" class="py-2 rounded-lg border text-sm font-medium bg-teal-700 text-white border-teal-700">Tunai (Cash)</button>
          <button type="button" id="btnQris" onclick="setMethod('qris')" class="py-2 rounded-lg border text-sm font-medium bg-white text-slate-700 border-slate-300">QRIS</button>
        </div>

        <div id="cashBox">
          <label class="block text-xs font-medium text-slate-600 mb-1">Uang Diterima (Rp)</label>
          <input id="cashInput" type="number" min="0" oninput="renderCart()" class="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm">
          <div class="mt-2 flex justify-between text-xs text-slate-600">
            <span>Kembalian</span>
            <span id="changeText" class="font-mono font-semibold text-slate-900">Rp 0</span>
          </div>
        </div>

        <div id="qrisBox" class="hidden p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
          <p class="text-xs text-slate-600 mb-2">Tunjukkan QRIS kepada pelanggan untuk dipindai.</p>
          <img id="qrisImg" alt="Kode QRIS" class="mx-auto w-40 h-40 bg-white p-2 border border-slate-200 rounded">
        </div>

        <button type="button" onclick="submitCheckout()" class="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm rounded-lg">
          Proses Pembayaran &amp; Cetak Struk
        </button>
      </div>
    </section>
  </main>

  <script>
    const PRODUCTS = <?= json_encode($products, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?>;
    const CSRF_TOKEN = <?= json_encode($csrf) ?>;
    const cart = new Map();
    let method = 'cash';

    const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');

    document.getElementById('searchBox').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.product-card').forEach((el) => {
        el.style.display = el.dataset.search.includes(q) ? '' : 'none';
      });
    });

    function addToCart(id) {
      const p = PRODUCTS.find((x) => Number(x.id) === Number(id));
      if (!p) return;
      const cur = cart.get(p.id) || { product: p, qty: 0 };
      if (cur.qty + 1 > Number(p.stock)) return alert('Stok tidak mencukupi.');
      cur.qty += 1;
      cart.set(p.id, cur);
      renderCart();
    }

    function updateQty(id, delta) {
      const cur = cart.get(id);
      if (!cur) return;
      const next = cur.qty + delta;
      if (next <= 0) cart.delete(id);
      else if (next <= Number(cur.product.stock)) cur.qty = next;
      renderCart();
    }

    function setMethod(m) {
      method = m;
      document.getElementById('cashBox').classList.toggle('hidden', m !== 'cash');
      document.getElementById('qrisBox').classList.toggle('hidden', m !== 'qris');
      document.getElementById('btnCash').className = m === 'cash'
        ? 'py-2 rounded-lg border text-sm font-medium bg-teal-700 text-white border-teal-700'
        : 'py-2 rounded-lg border text-sm font-medium bg-white text-slate-700 border-slate-300';
      document.getElementById('btnQris').className = m === 'qris'
        ? 'py-2 rounded-lg border text-sm font-medium bg-teal-700 text-white border-teal-700'
        : 'py-2 rounded-lg border text-sm font-medium bg-white text-slate-700 border-slate-300';
      renderCart();
    }

    function renderCart() {
      const list = document.getElementById('cartList');
      let total = 0;
      let html = '';
      for (const [id, item] of cart.entries()) {
        const sub = Number(item.product.sell_price) * item.qty;
        total += sub;
        html += `<div class="py-2.5 flex items-center justify-between gap-2">
          <div><div class="font-medium">${item.product.name}</div><div class="text-xs text-slate-500 font-mono">${rupiah(item.product.sell_price)} x ${item.qty}</div></div>
          <div class="flex items-center gap-2">
            <button onclick="updateQty(${id}, -1)" class="w-7 h-7 border rounded">-</button>
            <span class="font-mono w-6 text-center">${item.qty}</span>
            <button onclick="updateQty(${id}, 1)" class="w-7 h-7 border rounded">+</button>
          </div>
        </div>`;
      }
      list.innerHTML = html || '<p class="text-slate-400 py-6 text-center">Belum ada barang dipilih.</p>';
      document.getElementById('totalText').textContent = rupiah(total);
      const paid = Number(document.getElementById('cashInput').value || 0);
      document.getElementById('changeText').textContent = rupiah(Math.max(0, paid - total));
      if (method === 'qris') {
        const payload = encodeURIComponent('QRIS|KASIRKITA|TOTAL=' + Math.round(total));
        document.getElementById('qrisImg').src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + payload;
      }
    }

    async function submitCheckout() {
      if (cart.size === 0) return alert('Pilih barang terlebih dahulu.');
      const items = Array.from(cart.values()).map((c) => ({ product_id: c.product.id, qty: c.qty }));
      const cashPaid = Number(document.getElementById('cashInput').value || 0);
      const res = await fetch('api/checkout.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csrf_token: CSRF_TOKEN, items, payment_method: method, cash_paid: cashPaid })
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Transaksi gagal.');
      window.location.href = 'receipt.php?invoice=' + encodeURIComponent(data.invoice_no);
    }

    renderCart();
  </script>
</body>
</html>
