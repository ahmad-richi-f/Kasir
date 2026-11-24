import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, FileSpreadsheet, FileText, Printer, RefreshCw } from 'lucide-react';
import type { DailyReport, Transaction } from '../types';
import {
  exportDailyReportExcel,
  exportDailyReportPdf,
  formatDateTime,
  formatRupiah,
  getTodayLocalISO,
} from '../utils/format';

interface ReportsViewProps {
  authToken: string;
  onSelectReceipt: (trx: Transaction) => void;
}

export function ReportsView({ authToken, onSelectReceipt }: ReportsViewProps) {
  const [selectedDate, setSelectedDate] = useState(getTodayLocalISO());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(
    async (dateStr: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/daily?date=${encodeURIComponent(dateStr)}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          const data = (await res.json()) as DailyReport;
          setReport(data);
        }
      } finally {
        setLoading(false);
      }
    },
    [authToken],
  );

  useEffect(() => {
    loadReport(selectedDate);
  }, [selectedDate, loadReport]);

  const paymentSplit = useMemo(() => {
    if (!report || report.summary.totalRevenue <= 0) {
      return { cashPct: 50, qrisPct: 50 };
    }
    const cashPct = Math.round((report.summary.cashTotal / report.summary.totalRevenue) * 100);
    return { cashPct, qrisPct: 100 - cashPct };
  }, [report]);

  const hourlyBuckets = useMemo(() => {
    const slots = [
      { label: '08-10', min: 8, max: 10, total: 0 },
      { label: '10-12', min: 10, max: 12, total: 0 },
      { label: '12-14', min: 12, max: 14, total: 0 },
      { label: '14-16', min: 14, max: 16, total: 0 },
      { label: '16-18', min: 16, max: 18, total: 0 },
      { label: '18-22', min: 18, max: 24, total: 0 },
    ];
    if (!report) return slots;
    for (const trx of report.transactions) {
      const hour = new Date(trx.createdAt).getUTCHours();
      const target = slots.find((s) => hour >= s.min && hour < s.max) || slots[slots.length - 1];
      target.total += trx.totalAmount;
    }
    return slots;
  }, [report]);

  const maxHourlyTotal = useMemo(
    () => Math.max(1, ...hourlyBuckets.map((b) => b.total)),
    [hourlyBuckets],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Laporan Penjualan Harian Otomatis</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekapitulasi transaksi Tunai dan QRIS diperbarui otomatis setiap pembayaran selesai.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-slate-500 absolute left-3 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={() => loadReport(selectedDate)}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!report}
              onClick={() => report && exportDailyReportExcel(report)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              disabled={!report}
              onClick={() => report && exportDailyReportPdf(report)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Export PDF (.pdf)</span>
            </button>
          </div>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Total Omzet Harian</p>
          <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {loading || !report ? '—' : formatRupiah(report.summary.totalRevenue)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Jumlah Transaksi</p>
          <p className="mt-1.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {loading || !report ? '—' : `${report.summary.transactionCount} struk · ${report.summary.itemsSold} item`}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Pembayaran Tunai (Cash)</p>
          <p className="mt-1.5 font-mono text-xl font-bold text-emerald-700 tabular-nums">
            {loading || !report ? '—' : formatRupiah(report.summary.cashTotal)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">Pembayaran QRIS</p>
          <p className="mt-1.5 font-mono text-xl font-bold text-teal-700 tabular-nums">
            {loading || !report ? '—' : formatRupiah(report.summary.qrisTotal)}
          </p>
        </div>
      </section>

      {/* Visual Analytics Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Distribusi Penjualan per Jam</h3>
            <span className="text-xs text-slate-500 font-mono">{selectedDate}</span>
          </div>
          <div className="grid grid-cols-6 gap-3 items-end h-36 pt-4">
            {hourlyBuckets.map((bucket) => {
              const heightPct = bucket.total > 0 ? Math.max(12, Math.round((bucket.total / maxHourlyTotal) * 100)) : 4;
              return (
                <div key={bucket.label} className="flex flex-col items-center h-full justify-end gap-1.5">
                  <span className="font-mono text-[10px] text-slate-500 tabular-nums truncate max-w-full">
                    {bucket.total > 0 ? `${Math.round(bucket.total / 1000)}rb` : '0'}
                  </span>
                  <div className="w-full max-w-[38px] bg-slate-100 rounded-t-md h-24 flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        bucket.total > 0 ? 'bg-teal-700' : 'bg-slate-200'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-slate-600">{bucket.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Proporsi Tunai vs QRIS</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Perbandingan nilai pembayaran masuk untuk tanggal terpilih.
            </p>
          </div>

          <div className="my-5 space-y-3">
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all duration-300"
                style={{ width: `${paymentSplit.cashPct}%` }}
              />
              <div
                className="bg-teal-700 h-full transition-all duration-300"
                style={{ width: `${paymentSplit.qrisPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs tabular-nums">
              <div>
                <span className="font-semibold text-emerald-700">Tunai {paymentSplit.cashPct}%</span>
                <span className="block font-mono text-slate-600 mt-0.5">
                  {report ? formatRupiah(report.summary.cashTotal) : 'Rp 0'}
                </span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-teal-700">QRIS {paymentSplit.qrisPct}%</span>
                <span className="block font-mono text-slate-600 mt-0.5">
                  {report ? formatRupiah(report.summary.qrisTotal) : 'Rp 0'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
            Rata-rata nilai struk:{' '}
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              {report && report.summary.transactionCount > 0
                ? formatRupiah(report.summary.totalRevenue / report.summary.transactionCount)
                : 'Rp 0'}
            </span>
          </div>
        </div>
      </section>

      {report && report.topProducts.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Produk Terlaris Tanggal {report.date}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {report.topProducts.map((item) => (
              <div key={item.sku} className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg">
                <p className="font-mono text-[11px] text-slate-500">{item.sku}</p>
                <p className="text-xs font-semibold text-slate-900 truncate mt-0.5">{item.name}</p>
                <div className="mt-2 flex items-baseline justify-between text-xs tabular-nums">
                  <span className="font-mono font-bold text-teal-700">{item.qty} terjual</span>
                  <span className="font-mono text-slate-600">{formatRupiah(item.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Rincian Transaksi</h3>
          <span className="text-xs text-slate-500 font-mono">Tanggal: {selectedDate}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">No. Invoice</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Kasir</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Metode</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-400">
                    Memuat laporan penjualan...
                  </td>
                </tr>
              ) : !report || report.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-slate-500">
                    Belum ada transaksi penjualan tercatat pada tanggal {selectedDate}.
                  </td>
                </tr>
              ) : (
                report.transactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {trx.invoiceNo}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {formatDateTime(trx.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{trx.cashierName}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {trx.items.map((i) => `${i.productName} (${i.qty})`).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold uppercase whitespace-nowrap">
                      <span className={trx.paymentMethod === 'qris' ? 'text-teal-700' : 'text-emerald-700'}>
                        {trx.paymentMethod === 'qris' ? 'QRIS' : 'TUNAI'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatRupiah(trx.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectReceipt(trx)}
                        className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
