'use client';

import React from 'react';
import { X, Printer, Coffee } from 'lucide-react';
import { formatRupiah, formatDateTime } from '@/lib/utils';

interface ReceiptModalProps {
  receipt: any;
  onClose: () => void;
}

export default function ReceiptModal({ receipt, onClose }: ReceiptModalProps) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const items = receipt.items || [];
  const settings = receipt.settings || {
    store_name: 'BREWSPACE Coffee & Roastery',
    store_address: 'Jl. Senopati No. 42, Jakarta',
    store_phone: '+62 812-3456-7890',
    receipt_footer: 'Terima kasih telah berkunjung ke BREWSPACE!'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-coffee-800 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-coffee-300" />
            <h3 className="font-semibold text-lg font-display">Struk Transaksi</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content (Thermal Struk Look) */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-xs text-stone-800 space-y-4" id="thermal-receipt">
          <div className="text-center space-y-1 border-b border-dashed border-stone-300 pb-3">
            <h2 className="font-bold text-base font-display text-stone-900 tracking-wider">
              {settings.store_name || 'BREWSPACE'}
            </h2>
            <p className="text-stone-500">{settings.store_address}</p>
            <p className="text-stone-500">{settings.store_phone}</p>
          </div>

          <div className="space-y-1 border-b border-dashed border-stone-300 pb-3 text-stone-600">
            <div className="flex justify-between">
              <span>No. Invoice:</span>
              <span className="font-semibold text-stone-900">{receipt.invoice_number || receipt.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Waktu:</span>
              <span>{formatDateTime(receipt.created_at || receipt.date)}</span>
            </div>
            <div className="flex justify-between">
              <span>Kasir:</span>
              <span>{receipt.cashier_name || receipt.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span>{receipt.customer_name || receipt.customerName || 'Tamu'}</span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-semibold text-stone-900">{item.product_name || item.name}</div>
                <div className="flex justify-between text-stone-600">
                  <span>
                    {item.quantity} x {formatRupiah(item.price)}
                  </span>
                  <span>{formatRupiah(item.subtotal)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 border-b border-dashed border-stone-300 pb-3">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal:</span>
              <span>{formatRupiah(receipt.subtotal)}</span>
            </div>
            {Number(receipt.tax) > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Pajak (PB1):</span>
                <span>{formatRupiah(receipt.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-900 font-bold text-sm pt-1">
              <span>TOTAL:</span>
              <span>{formatRupiah(receipt.total_amount || receipt.total)}</span>
            </div>
            <div className="flex justify-between text-stone-600 pt-1">
              <span>Bayar ({receipt.payment_method || receipt.paymentMethod || 'cash'}):</span>
              <span>{formatRupiah(receipt.cash_received || receipt.cashReceived)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Kembalian:</span>
              <span>{formatRupiah(receipt.change_amount || receipt.change)}</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-stone-500 pt-2 space-y-1">
            <p className="font-medium">{settings.receipt_footer || 'Terima kasih telah berkunjung ke BREWSPACE!'}</p>
            <p className="text-[10px] text-stone-400">Wi-Fi: BrewSpace-Guest | Pass: kopienak123</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-stone-50 border-t flex gap-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-coffee-600 hover:bg-coffee-700 text-white font-medium text-sm transition shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Cetak Struk (POS)
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-medium text-sm transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

