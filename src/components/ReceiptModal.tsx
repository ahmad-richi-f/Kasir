import { Printer, X } from 'lucide-react';
import type { Transaction } from '../types';
import { formatDateTime, formatRupiah } from '../utils/format';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function ReceiptModal({ transaction, onClose }: ReceiptModalProps) {
  if (!transaction) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Pratinjau Struk Belanja</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup struk"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 bg-slate-50 flex justify-center">
          <div
            id="printable-receipt"
            className="w-full max-w-[300px] bg-white border border-slate-200 p-4 font-mono text-xs text-slate-900"
          >
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <p className="text-sm font-bold tracking-tight">TOKO KASIRKITA</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Jl. Merdeka No. 45, Indonesia</p>
              <p className="text-[11px] text-slate-600">Telp. (021) 555-0192</p>
            </div>

            <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">No. Struk</span>
                <span className="font-semibold">{transaction.invoiceNo}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Waktu</span>
                <span>{formatDateTime(transaction.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Kasir</span>
                <span>{transaction.cashierName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-600">Metode</span>
                <span className="font-semibold uppercase">
                  {transaction.paymentMethod === 'cash' ? 'TUNAI' : 'QRIS'}
                </span>
              </div>
            </div>

            <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
              {transaction.items.map((item, idx) => (
                <div key={`${item.sku}-${idx}`}>
                  <div className="font-semibold text-slate-900">{item.productName}</div>
                  <div className="flex justify-between text-[11px] text-slate-600 tabular-nums mt-0.5">
                    <span>
                      {item.qty} x {formatRupiah(item.unitPrice)}
                    </span>
                    <span className="text-slate-900 font-medium">{formatRupiah(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 space-y-1 text-[11px] tabular-nums">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Diskon</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-200">
                <span>TOTAL</span>
                <span>{formatRupiah(transaction.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Dibayar</span>
                <span>{formatRupiah(transaction.cashPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Kembalian</span>
                <span>{formatRupiah(transaction.changeAmount)}</span>
              </div>
              {transaction.qrisRef && (
                <div className="flex justify-between pt-1">
                  <span className="text-slate-600">Ref QRIS</span>
                  <span>{transaction.qrisRef}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center text-[11px] text-slate-600">
              <p>Terima kasih telah berbelanja!</p>
              <p className="mt-0.5">Barang yang sudah dibeli tidak dapat ditukar.</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk</span>
          </button>
        </div>
      </div>
    </div>
  );
}
