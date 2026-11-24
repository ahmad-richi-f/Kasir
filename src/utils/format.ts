import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { DailyReport } from '../types';

export function formatRupiah(value: number): string {
  return 'Rp ' + Math.round(value).toLocaleString('id-ID');
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getTodayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function exportDailyReportExcel(report: DailyReport): void {
  const summaryRows = [
    ['LAPORAN PENJUALAN HARIAN — KASIRKITA POS'],
    ['Tanggal Laporan', report.date],
    ['Total Penjualan', report.summary.totalRevenue],
    ['Jumlah Transaksi', report.summary.transactionCount],
    ['Total Tunai (Cash)', report.summary.cashTotal],
    ['Total QRIS', report.summary.qrisTotal],
    ['Total Barang Terjual', report.summary.itemsSold],
    [],
    ['No. Invoice', 'Waktu', 'Kasir', 'Metode', 'Subtotal', 'Diskon', 'Total', 'Ref QRIS'],
    ...report.transactions.map((trx) => [
      trx.invoiceNo,
      formatDateTime(trx.createdAt),
      trx.cashierName,
      trx.paymentMethod.toUpperCase(),
      trx.subtotal,
      trx.discount,
      trx.totalAmount,
      trx.qrisRef || '-',
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(summaryRows);
  ws['!cols'] = [
    { wch: 24 },
    { wch: 22 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Harian');

  if (report.topProducts.length > 0) {
    const productSheet = XLSX.utils.aoa_to_sheet([
      ['SKU', 'Nama Barang', 'Qty Terjual', 'Total Pendapatan'],
      ...report.topProducts.map((p) => [p.sku, p.name, p.qty, p.revenue]),
    ]);
    productSheet['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, productSheet, 'Produk Terlaris');
  }

  XLSX.writeFile(wb, `laporan-penjualan-${report.date}.xlsx`);
}

export function exportDailyReportPdf(report: DailyReport): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Laporan Penjualan Harian — Toko KasirKita', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal Laporan: ${report.date}`, 14, 25);
  doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 30);

  doc.setTextColor(15, 23, 42);
  autoTable(doc, {
    startY: 36,
    head: [['Ringkasan Harian', 'Nilai']],
    body: [
      ['Total Penjualan', formatRupiah(report.summary.totalRevenue)],
      ['Jumlah Transaksi', String(report.summary.transactionCount)],
      ['Pembayaran Tunai (Cash)', formatRupiah(report.summary.cashTotal)],
      ['Pembayaran QRIS', formatRupiah(report.summary.qrisTotal)],
      ['Total Item Terjual', `${report.summary.itemsSold} unit`],
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110] },
    styles: { fontSize: 9 },
  });

  const afterSummaryY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;

  autoTable(doc, {
    startY: afterSummaryY + 8,
    head: [['No. Invoice', 'Waktu', 'Kasir', 'Metode', 'Total']],
    body:
      report.transactions.length > 0
        ? report.transactions.map((trx) => [
            trx.invoiceNo,
            formatDateTime(trx.createdAt),
            trx.cashierName,
            trx.paymentMethod.toUpperCase(),
            formatRupiah(trx.totalAmount),
          ])
        : [['-', '-', 'Belum ada transaksi pada tanggal ini', '-', 'Rp 0']],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42] },
    styles: { fontSize: 8.5 },
    columnStyles: {
      4: { halign: 'right' },
    },
  });

  doc.save(`laporan-penjualan-${report.date}.pdf`);
}
