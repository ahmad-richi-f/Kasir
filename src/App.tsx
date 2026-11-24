/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Store,
  Users,
  X,
} from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { EmployeesView } from './components/EmployeesView';
import { InventoryView } from './components/InventoryView';
import { PosView } from './components/PosView';
import { ReceiptModal } from './components/ReceiptModal';
import { ReportsView } from './components/ReportsView';
import type { EmployeeUser, LowStockWarning, Product, Transaction } from './types';

type ActiveTab = 'pos' | 'inventory' | 'reports' | 'employees';

export default function App() {
  const [authStatusLoading, setAuthStatusLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<EmployeeUser | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const [inventoryInitialFilter, setInventoryInitialFilter] = useState<'all' | 'low' | 'out'>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);
  const [postSaleWarnings, setPostSaleWarnings] = useState<LowStockWarning[]>([]);

  const checkAuthStatus = useCallback(async () => {
    setAuthStatusLoading(true);
    try {
      const res = await fetch('/api/auth/status');
      if (res.ok) {
        const data = await res.json();
        setNeedsSetup(Boolean(data.needsSetup));
      }
    } finally {
      setAuthStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const fetchProducts = useCallback(async () => {
    if (!authToken) return;
    const res = await fetch('/api/products', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.status === 401) {
      setAuthToken(null);
      setCurrentUser(null);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setProducts(data.products || []);
      setLowStockItems(data.lowStockItems || []);
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      fetchProducts();
    }
  }, [authToken, fetchProducts]);

  function handleAuthenticated(token: string, user: EmployeeUser) {
    setAuthToken(token);
    setCurrentUser(user);
    setNeedsSetup(false);
    setActiveTab('pos');
  }

  function handleLogout() {
    setAuthToken(null);
    setCurrentUser(null);
    setProducts([]);
    setLowStockItems([]);
    setActiveReceipt(null);
    setPostSaleWarnings([]);
    setNotifOpen(false);
    checkAuthStatus();
  }

  async function handleTransactionComplete(trx: Transaction, warnings: LowStockWarning[]) {
    setActiveReceipt(trx);
    setPostSaleWarnings(warnings);
    await fetchProducts();
  }

  function navigateTo(tab: ActiveTab, filter: 'all' | 'low' | 'out' = 'all') {
    setInventoryInitialFilter(filter);
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setNotifOpen(false);
  }

  if (authStatusLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Memuat sistem kasir...
      </div>
    );
  }

  if (!authToken || !currentUser) {
    return <AuthScreen needsSetup={needsSetup} onAuthenticated={handleAuthenticated} />;
  }

  const navItems: Array<{ id: ActiveTab; label: string; icon: typeof ShoppingCart; adminOnly?: boolean }> = [
    { id: 'pos', label: 'Terminal Kasir', icon: ShoppingCart },
    { id: 'inventory', label: 'Kelola Stok', icon: Package },
    { id: 'reports', label: 'Laporan Harian', icon: BarChart3 },
    { id: 'employees', label: 'Karyawan', icon: Users, adminOnly: true },
  ];

  const tabTitles: Record<ActiveTab, string> = {
    pos: 'Kasir / Transaksi Penjualan',
    inventory: 'Kelola Stok & Barang',
    reports: 'Laporan Penjualan Harian',
    employees: 'Manajemen Karyawan',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col bg-white border-r border-slate-200 shrink-0">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900 whitespace-nowrap">
            KasirKita POS
          </span>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || currentUser.role === 'admin')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateTo(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-50 text-teal-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.id === 'inventory' && lowStockItems.length > 0 && (
                    <span className="font-mono text-xs font-semibold text-amber-700">
                      {lowStockItems.length}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <div className="text-xs">
            <p className="font-semibold text-slate-900 truncate">{currentUser.fullName}</p>
            <p className="text-slate-500 mt-0.5 capitalize">
              @{currentUser.username} · {currentUser.role}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Shift</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col border-r border-slate-200 z-10">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-base text-slate-900">KasirKita POS</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems
                .filter((item) => !item.adminOnly || currentUser.role === 'admin')
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateTo(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                        isActive
                          ? 'bg-teal-50 text-teal-800 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </span>
                      {item.id === 'inventory' && lowStockItems.length > 0 && (
                        <span className="font-mono text-xs font-semibold text-amber-700">
                          {lowStockItems.length}
                        </span>
                      )}
                    </button>
                  );
                })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-900">{currentUser.fullName}</p>
              <p className="text-xs text-slate-500 capitalize mb-3">
                @{currentUser.username} · {currentUser.role}
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 px-3 border border-slate-300 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Shift</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi"
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {tabTitles[activeTab]}
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-500">
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                · Kasir: {currentUser.fullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative shrink-0">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label="Notifikasi stok menipis"
              className={`px-3 py-2 rounded-lg border text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                lowStockItems.length > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifikasi Stok</span>
              <span className="font-mono tabular-nums">({lowStockItems.length})</span>
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 z-40">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900">Peringatan Stok Barang</span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {lowStockItems.length === 0 ? (
                  <p className="py-5 text-center text-xs text-slate-500">
                    Semua stok barang dalam kondisi aman.
                  </p>
                ) : (
                  <div className="mt-2 divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {lowStockItems.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{item.name}</p>
                          <p className="text-slate-500 font-mono">{item.sku}</p>
                        </div>
                        <span
                          className={`font-mono font-semibold shrink-0 tabular-nums ${
                            item.stock <= 0 ? 'text-red-600' : 'text-amber-700'
                          }`}
                        >
                          {item.stock <= 0 ? 'Habis' : `Sisa ${item.stock} ${item.unit}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => navigateTo('inventory', 'low')}
                  className="mt-3 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Kelola Stok Sekarang
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-4">
          {postSaleWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    Perhatian: Stok barang berikut baru saja mencapai batas minimum setelah transaksi:
                  </p>
                  <p className="mt-0.5 text-amber-800">
                    {postSaleWarnings
                      .map((w) => `${w.name} (tersisa ${w.stock} ${w.unit})`)
                      .join(' · ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPostSaleWarnings([])}
                className="text-xs font-semibold text-amber-800 hover:underline shrink-0 cursor-pointer"
              >
                Tutup Peringatan
              </button>
            </div>
          )}

          {activeTab === 'pos' && (
            <PosView
              products={products}
              authToken={authToken}
              onTransactionComplete={handleTransactionComplete}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={products}
              authToken={authToken}
              initialFilter={inventoryInitialFilter}
              onRefresh={fetchProducts}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              authToken={authToken}
              onSelectReceipt={(trx) => setActiveReceipt(trx)}
            />
          )}

          {activeTab === 'employees' && currentUser.role === 'admin' && (
            <EmployeesView authToken={authToken} currentUser={currentUser} />
          )}
        </main>
      </div>

      <ReceiptModal transaction={activeReceipt} onClose={() => setActiveReceipt(null)} />
    </div>
  );
}
