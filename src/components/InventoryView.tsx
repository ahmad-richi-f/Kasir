import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, PackagePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { Product } from '../types';
import { formatRupiah } from '../utils/format';

interface InventoryViewProps {
  products: Product[];
  authToken: string;
  initialFilter?: 'all' | 'low' | 'out';
  onRefresh: () => Promise<void>;
}

export function InventoryView({
  products,
  authToken,
  initialFilter = 'all',
  onRefresh,
}: InventoryViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>(initialFilter);
  const [modalMode, setModalMode] = useState<'closed' | 'add' | 'edit'>('closed');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Minuman');
  const [unit, setUnit] = useState('pcs');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [submitting, setSubmitting] = useState(false);
  const [restockingId, setRestockingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const lowStockItems = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= p.minStock),
    [products],
  );
  const outStockItems = useMemo(() => products.filter((p) => p.stock <= 0), [products]);
  const totalUnits = useMemo(() => products.reduce((sum, p) => sum + p.stock, 0), [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'low' && p.stock <= p.minStock) ||
        (statusFilter === 'out' && p.stock <= 0);
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [products, statusFilter, search]);

  function openAddModal() {
    setErrorMsg(null);
    setEditingProduct(null);
    setSku(`BRG-${String(products.length + 1).padStart(3, '0')}`);
    setName('');
    setCategory('Minuman');
    setUnit('pcs');
    setBuyPrice('');
    setSellPrice('');
    setStock('');
    setMinStock('5');
    setModalMode('add');
  }

  function openEditModal(product: Product) {
    setErrorMsg(null);
    setEditingProduct(product);
    setSku(product.sku);
    setName(product.name);
    setCategory(product.category);
    setUnit(product.unit);
    setBuyPrice(String(product.buyPrice));
    setSellPrice(String(product.sellPrice));
    setStock(String(product.stock));
    setMinStock(String(product.minStock));
    setModalMode('edit');
  }

  async function quickRestock(product: Product, addQty: number) {
    setRestockingId(product.id);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ stock: product.stock + addQty }),
      });
      if (res.ok) {
        await onRefresh();
      }
    } finally {
      setRestockingId(null);
    }
  }

  async function handleSaveProduct(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const isEdit = modalMode === 'edit' && editingProduct;
      const url = isEdit ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sku: sku.trim(),
          name: name.trim(),
          category: category.trim(),
          unit: unit.trim(),
          buyPrice: Number(buyPrice) || 0,
          sellPrice: Number(sellPrice) || 0,
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal menyimpan barang.');
        return;
      }
      setModalMode('closed');
      await onRefresh();
    } catch {
      setErrorMsg('Koneksi server bermasalah.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProduct() {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        setDeleteTarget(null);
        await onRefresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {(lowStockItems.length > 0 || outStockItems.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-950">
              <p className="font-semibold">
                Peringatan Persediaan Barang ({lowStockItems.length + outStockItems.length} item perlu restock)
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {products
                  .filter((p) => p.stock <= p.minStock)
                  .slice(0, 4)
                  .map((p) => `${p.name} (sisa ${p.stock} ${p.unit})`)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('low')}
            className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            Filter Stok Menipis
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kelola Stok &amp; Katalog Barang</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tambah barang baru, isi ulang stok cepat, ubah harga jual, atau hapus produk.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Barang Baru</span>
        </button>
      </div>

      {/* Inventory Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Jenis Barang</p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {products.length} SKU
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Persediaan</p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {totalUnits.toLocaleString('id-ID')} unit
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Stok Hampir Habis</p>
          <p className="mt-1 font-mono text-xl font-bold text-amber-700 tabular-nums">
            {lowStockItems.length} item
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Stok Habis</p>
          <p className="mt-1 font-mono text-xl font-bold text-red-600 tabular-nums">
            {outStockItems.length} item
          </p>
        </div>
      </section>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama barang atau kode SKU..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
            {[
              { key: 'all', label: `Semua (${products.length})` },
              { key: 'low', label: `Stok Menipis (${lowStockItems.length + outStockItems.length})` },
              { key: 'out', label: `Habis (${outStockItems.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key as 'all' | 'low' | 'out')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Nama Barang</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Harga Beli</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-right">Stok</th>
                <th className="px-4 py-3">Indikator</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-xs text-slate-500">
                    Tidak ada barang yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isOut = p.stock <= 0;
                  const isLow = p.stock > 0 && p.stock <= p.minStock;
                  const targetCap = Math.max(10, p.minStock * 3);
                  const ratioPct = Math.min(100, Math.round((p.stock / targetCap) * 100));

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {p.sku}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{p.category}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {formatRupiah(p.buyPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatRupiah(p.sellPrice)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums whitespace-nowrap">
                        {p.stock} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap min-w-[140px]">
                        <div className="space-y-1">
                          <span
                            className={`block font-semibold ${
                              isOut
                                ? 'text-red-700'
                                : isLow
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                            }`}
                          >
                            {isOut
                              ? 'Stok Habis'
                              : isLow
                                ? `Menipis (min. ${p.minStock})`
                                : 'Aman'}
                          </span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isOut
                                  ? 'bg-red-500'
                                  : isLow
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-600'
                              }`}
                              style={{ width: `${ratioPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={restockingId === p.id}
                            onClick={() => quickRestock(p, 10)}
                            title="Tambah stok +10"
                            className="px-2.5 py-1.5 border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>+10</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(p)}
                            className="px-2.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-700 text-xs font-medium rounded-lg inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode !== 'closed' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {modalMode === 'add' ? 'Tambah Barang Baru' : `Edit Barang: ${editingProduct?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => setModalMode('closed')}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode SKU</label>
                <input
                  required
                  disabled={modalMode === 'edit'}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                <input
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Minuman / Makanan / Sembako"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nama Barang</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Kopi Arabika 200g"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Harga Beli (Rp)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={buyPrice}
                  onChange={(e) => setBuyPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Harga Jual (Rp)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jumlah Stok</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Batas Notifikasi Menipis</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={minStock}
                  onChange={(e) => setMinStock(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                <input
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pcs / botol / pack / karung"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalMode('closed')}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Barang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-slate-900">Hapus Barang?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Barang <strong>{deleteTarget.name}</strong> ({deleteTarget.sku}) akan dihapus dari katalog kasir.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteProduct}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                {submitting ? 'Menghapus...' : 'Ya, Hapus Barang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
