import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Banknote,
  Coffee,
  Cookie,
  Minus,
  Package,
  Plus,
  QrCode,
  Search,
  ShoppingBag,
  ShoppingBasket,
  Trash2,
  Utensils,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { CartItem, LowStockWarning, Product, Transaction } from '../types';
import { formatRupiah } from '../utils/format';

interface PosViewProps {
  products: Product[];
  authToken: string;
  onTransactionComplete: (trx: Transaction, warnings: LowStockWarning[]) => void;
}

function getCategoryIcon(category: string) {
  const lower = category.toLowerCase();
  if (lower.includes('minum') || lower.includes('kopi') || lower.includes('teh')) {
    return Coffee;
  }
  if (lower.includes('makan') || lower.includes('roti')) {
    return Utensils;
  }
  if (lower.includes('snack') || lower.includes('kue')) {
    return Cookie;
  }
  if (lower.includes('sembako')) {
    return ShoppingBasket;
  }
  return Package;
}

export function PosView({ products, authToken, onTransactionComplete }: PosViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountInput, setDiscountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [cashInput, setCashInput] = useState('');
  const [qrisDataUrl, setQrisDataUrl] = useState<string>('');
  const [qrisVerified, setQrisVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<'catalog' | 'cart'>('catalog');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['Semua', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'id'))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = categoryFilter === 'Semua' || p.category === categoryFilter;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [products, categoryFilter, search]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.sellPrice * item.qty, 0),
    [cart],
  );
  const discount = Math.max(0, Math.min(subtotal, Number(discountInput) || 0));
  const totalAmount = Math.max(0, subtotal - discount);
  const cashPaid = Math.max(0, Number(cashInput) || 0);
  const changeAmount = Math.max(0, cashPaid - totalAmount);
  const totalQty = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  useEffect(() => {
    let cancelled = false;
    if (paymentMethod === 'qris' && totalAmount > 0) {
      const qrisPayload = `00020101021226580014ID.KASIRKITA.WWW0118936005030000089814520454115303360540${Math.round(totalAmount)}5802ID5912KASIRKITA POS6007JAKARTA6304`;
      QRCode.toDataURL(qrisPayload, { width: 220, margin: 1 })
        .then((url) => {
          if (!cancelled) setQrisDataUrl(url);
        })
        .catch(() => {
          if (!cancelled) setQrisDataUrl('');
        });
    } else {
      setQrisDataUrl('');
    }
    setQrisVerified(false);
    return () => {
      cancelled = true;
    };
  }, [paymentMethod, totalAmount]);

  function addToCart(product: Product) {
    setErrorMsg(null);
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          setErrorMsg(`Stok "${product.name}" hanya tersisa ${product.stock} ${product.unit}.`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function adjustQty(productId: number, delta: number) {
    setErrorMsg(null);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const next = item.qty + delta;
          if (next <= 0) return null;
          if (next > item.product.stock) {
            setErrorMsg(`Maksimal stok tersedia: ${item.product.stock} ${item.product.unit}.`);
            return item;
          }
          return { ...item, qty: next };
        })
        .filter((x): x is CartItem => x !== null),
    );
  }

  async function handleCheckout() {
    setErrorMsg(null);
    if (cart.length === 0) {
      setErrorMsg('Tambahkan minimal 1 barang ke keranjang.');
      return;
    }
    if (paymentMethod === 'cash' && cashPaid < totalAmount) {
      setErrorMsg('Nominal uang tunai kurang dari total pembayaran.');
      return;
    }
    if (paymentMethod === 'qris' && !qrisVerified) {
      setErrorMsg('Konfirmasikan terlebih dahulu bahwa pembayaran QRIS telah diterima.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          items: cart.map((item) => ({ productId: item.product.id, qty: item.qty })),
          paymentMethod,
          discount,
          cashPaid: paymentMethod === 'cash' ? cashPaid : totalAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal memproses transaksi.');
        return;
      }

      setCart([]);
      setCashInput('');
      setDiscountInput('');
      setQrisVerified(false);
      setMobilePane('catalog');
      onTransactionComplete(data.transaction, data.lowStockWarnings || []);
    } catch {
      setErrorMsg('Terjadi gangguan koneksi saat menyimpan transaksi.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="lg:hidden flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl">
        <button
          type="button"
          onClick={() => setMobilePane('catalog')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            mobilePane === 'catalog' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Katalog Barang ({filteredProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setMobilePane('cart')}
          className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            mobilePane === 'cart' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Keranjang ({totalQty}) · {formatRupiah(totalAmount)}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section
          className={`lg:col-span-7 xl:col-span-8 space-y-4 ${
            mobilePane === 'cart' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama barang, kode SKU, atau kategori... (tekan /)"
                className="w-full pl-10 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
              />
              <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded">
                /
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {filteredProducts.length} barang tersedia
              </span>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <p className="text-sm font-semibold text-slate-800">Barang tidak ditemukan</p>
              <p className="text-xs text-slate-500 mt-1">
                Coba ubah kata kunci pencarian atau pilih kategori Semua.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredProducts.map((product) => {
                const isOut = product.stock <= 0;
                const isLow = product.stock > 0 && product.stock <= product.minStock;
                const inCartQty = cart.find((c) => c.product.id === product.id)?.qty ?? 0;
                const CategoryIcon = getCategoryIcon(product.category);

                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={isOut}
                    onClick={() => addToCart(product)}
                    className={`group text-left bg-white border rounded-xl p-4 transition-all duration-150 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
                      inCartQty > 0
                        ? 'border-teal-600 ring-2 ring-teal-600/15 bg-teal-50/20'
                        : 'border-slate-200 hover:border-teal-600 hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          inCartQty > 0
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-700'
                        }`}
                      >
                        <CategoryIcon className="w-4 h-4" />
                      </div>
                      <div className="text-right min-w-0">
                        <span className="block font-mono text-[11px] text-slate-500 truncate">
                          {product.sku} · {product.category}
                        </span>
                        {inCartQty > 0 && (
                          <span className="block font-mono text-xs font-bold text-teal-700 mt-0.5">
                            {inCartQty} dipilih
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-3 text-sm font-semibold text-slate-900 line-clamp-2 min-h-[2.5rem] leading-snug">
                      {product.name}
                    </h3>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline justify-between gap-2">
                      <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                        {formatRupiah(product.sellPrice)}
                      </span>
                      <span
                        className={`text-xs tabular-nums whitespace-nowrap ${
                          isOut
                            ? 'text-red-600 font-semibold'
                            : isLow
                              ? 'text-amber-700 font-semibold'
                              : 'text-slate-500'
                        }`}
                      >
                        {isOut
                          ? 'Stok Habis'
                          : isLow
                            ? `Menipis · ${product.stock} ${product.unit}`
                            : `Stok ${product.stock} ${product.unit}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section
          className={`lg:col-span-5 xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 lg:sticky lg:top-20 ${
            mobilePane === 'catalog' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-teal-700" />
              <h2 className="text-sm font-bold text-slate-900">Keranjang Belanja</h2>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setCart([]);
                  setErrorMsg(null);
                }}
                className="text-xs font-medium text-slate-500 hover:text-red-600 inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="py-12 text-center space-y-1.5">
                <ShoppingBag className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-600">Keranjang masih kosong</p>
                <p className="text-[11px] text-slate-400">
                  Klik produk di katalog untuk mulai transaksi.
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                      {formatRupiah(item.product.sellPrice)} × {item.qty} ={' '}
                      <span className="text-slate-900 font-semibold">
                        {formatRupiah(item.product.sellPrice * item.qty)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => adjustQty(item.product.id, -1)}
                      aria-label={`Kurangi ${item.product.name}`}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-mono text-xs font-bold tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjustQty(item.product.id, 1)}
                      aria-label={`Tambah ${item.product.name}`}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Subtotal ({totalQty} item)</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {formatRupiah(subtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <label htmlFor="discountInput" className="text-slate-600 whitespace-nowrap">
                Potongan / Diskon (Rp)
              </label>
              <input
                id="discountInput"
                type="number"
                min={0}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0"
                className="w-32 px-2.5 py-1.5 text-right font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div className="flex items-baseline justify-between pt-3 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-900">Total Tagihan</span>
              <span className="font-mono text-2xl font-bold text-teal-700 tabular-nums">
                {formatRupiah(totalAmount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-teal-700 border-teal-700 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Banknote className="w-4 h-4 shrink-0" />
                  <span>Tunai</span>
                </div>
                <span
                  className={`block text-[11px] mt-0.5 ${
                    paymentMethod === 'cash' ? 'text-teal-100' : 'text-slate-500'
                  }`}
                >
                  Uang cash &amp; kembalian
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'qris'
                    ? 'bg-teal-700 border-teal-700 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>QRIS</span>
                </div>
                <span
                  className={`block text-[11px] mt-0.5 ${
                    paymentMethod === 'qris' ? 'text-teal-100' : 'text-slate-500'
                  }`}
                >
                  Scan dompet digital
                </span>
              </button>
            </div>

            {paymentMethod === 'cash' ? (
              <div className="space-y-2.5 pt-1">
                <div>
                  <label htmlFor="cashInput" className="block text-xs font-semibold text-slate-700 mb-1">
                    Uang Diterima (Rp)
                  </label>
                  <input
                    id="cashInput"
                    type="number"
                    min={0}
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    placeholder="Masukkan nominal bayar"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: 'Uang Pas', value: totalAmount },
                    { label: '20 rb', value: 20000 },
                    { label: '50 rb', value: 50000 },
                    { label: '100 rb', value: 100000 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCashInput(String(preset.value))}
                      className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Kembalian</span>
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      cashPaid > 0 && cashPaid < totalAmount ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {cashPaid > 0 && cashPaid < totalAmount
                      ? `Kurang ${formatRupiah(totalAmount - cashPaid)}`
                      : formatRupiah(changeAmount)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2.5">
                <div className="text-xs">
                  <p className="font-bold text-slate-900">QRIS TOKO KASIRKITA</p>
                  <p className="font-mono text-[11px] text-slate-500">NMID: ID1026008941201</p>
                </div>
                {qrisDataUrl ? (
                  <img
                    src={qrisDataUrl}
                    alt="Kode Pembayaran QRIS"
                    className="w-40 h-40 mx-auto bg-white p-2.5 border border-slate-200 rounded-xl"
                  />
                ) : (
                  <div className="w-40 h-40 mx-auto bg-white border border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    Pilih barang dulu
                  </div>
                )}
                <p className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                  {formatRupiah(totalAmount)}
                </p>
                <label className="flex items-center justify-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={qrisVerified}
                    onChange={(e) => setQrisVerified(e.target.checked)}
                    className="w-4 h-4 accent-teal-700 rounded cursor-pointer"
                  />
                  <span>Pembayaran QRIS sudah masuk</span>
                </label>
              </div>
            )}

            {errorMsg && (
              <div role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              disabled={submitting || cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
            >
              {submitting ? 'Menyimpan Transaksi...' : 'Proses Pembayaran & Cetak Struk'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
