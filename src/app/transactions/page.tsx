'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ReceiptModal from '@/components/ReceiptModal';
import { useToast } from '@/components/Toast';
import { Transaction, User } from '@/types';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { Search, Calendar, Eye, Receipt, FileText, AlertTriangle, X } from 'lucide-react';

export default function TransactionsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  // Cancellation State
  const [cancelModalTrx, setCancelModalTrx] = useState<Transaction | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const loadTransactions = (currUser: User | null) => {
    const isKasir = currUser?.role === 'kasir';
    const endpoint = isKasir ? '/api/pos/transactions' : '/api/admin/transactions';
    const params = new URLSearchParams();
    if (dateFilter) {
      if (isKasir) params.set('date', dateFilter);
      else {
        params.set('startDate', dateFilter);
        params.set('endDate', dateFilter);
      }
    }
    if (search && !isKasir) params.set('search', search);

    const url = `${endpoint}?${params.toString()}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTransactions(d.transactions || []);
      })
      .catch(() => showToast('Gagal memuat transaksi.', 'error'));
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('brewspace_token') : null;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('/api/auth/me', { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.user) {
          router.push('/');
        } else {
          setUser(data.user);
          loadTransactions(data.user);
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  useEffect(() => {
    if (user) {
      loadTransactions(user);
    }
  }, [dateFilter, search]);

  const viewReceipt = async (id: number) => {
    try {
      const res = await fetch(`/api/pos/receipt/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedReceipt(data.receipt);
      } else {
        showToast('Gagal memuat struk.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan.', 'error');
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalTrx) return;
    if (!cancelReason.trim()) {
      showToast('Harap masukkan alasan pembatalan transaksi.', 'error');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const res = await fetch(`/api/pos/transactions/${cancelModalTrx.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Gagal membatalkan transaksi.', 'error');
        setIsSubmittingCancel(false);
        return;
      }

      showToast(`Transaksi ${cancelModalTrx.invoice_number} berhasil dibatalkan. Stok otomatis dikembalikan!`, 'success');
      setCancelModalTrx(null);
      setCancelReason('');
      if (user) loadTransactions(user);
    } catch {
      showToast('Gagal menghubungi server.', 'error');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-coffee-100">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Riwayat Transaksi Penjualan"
          subtitle="Daftar Lengkap Faktur, Metode Pembayaran, dan Akses Cetak Struk"
          user={user}
        />

        <div className="p-8 space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nomor invoice / kasir..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-coffee-200 bg-white text-xs focus:ring-2 focus:ring-coffee-600 focus:outline-none"
                />
              </div>

              <div className="relative">
                <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10 pr-3 py-2.5 rounded-xl border border-coffee-200 bg-white text-xs font-mono focus:ring-2 focus:ring-coffee-600 focus:outline-none"
                />
              </div>

              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800"
                >
                  Reset Tanggal
                </button>
              )}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-coffee-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-coffee-50 border-b border-coffee-200 text-coffee-800 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">No. Invoice</th>
                  <th className="py-3 px-4">Waktu Transaksi</th>
                  <th className="py-3 px-4">Kasir / Pelanggan</th>
                  <th className="py-3 px-4">Metode Bayar</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Total Transaksi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-400">
                      Tidak ada transaksi yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const isCancelled = t.payment_status === 'cancelled';
                    const canCancel = !isCancelled && (user?.role === 'admin' || t.user_id === user?.id);

                    return (
                      <tr key={t.id} className={`hover:bg-coffee-50/40 transition ${isCancelled ? 'bg-rose-50/30' : ''}`}>
                        <td className="py-3 px-4 font-mono font-bold text-coffee-800">
                          {t.invoice_number}
                        </td>
                        <td className="py-3 px-4 text-stone-500">{formatDateTime(t.created_at)}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-stone-900 block">{t.cashier_name}</span>
                          <span className="text-[10px] text-stone-400">
                            Tamu: {t.customer_name || 'Tamu'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-700">
                            {t.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isCancelled ? (
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-block"
                              title={`Dibatalkan oleh: ${t.cancelled_by || '-'}\nAlasan: ${t.cancel_reason || '-'}`}
                            >
                              Dibatalkan
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block">
                              Selesai
                            </span>
                          )}
                        </td>
                        <td className={`py-3 px-4 font-mono font-bold text-right ${isCancelled ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {formatRupiah(t.total_amount)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => viewReceipt(t.id)}
                              className="py-1 px-2.5 rounded-lg border border-coffee-200 hover:bg-coffee-50 text-coffee-700 font-semibold text-[11px] inline-flex items-center gap-1 transition shadow-xs"
                              title="Lihat atau Cetak Struk"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Struk</span>
                            </button>

                            {canCancel && (
                              <button
                                onClick={() => {
                                  setCancelModalTrx(t);
                                  setCancelReason('');
                                }}
                                className="py-1 px-2.5 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] inline-flex items-center gap-1 transition"
                                title="Batalkan transaksi ini (Stok otomatis dikembalikan)"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Void</span>
                              </button>
                            )}
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
      </main>

      {/* Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal receipt={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}

      {/* Cancel / Void Transaction Modal */}
      {cancelModalTrx && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-600 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Batalkan Transaksi (Void)</h3>
                  <p className="text-xs text-rose-100">{cancelModalTrx.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => setCancelModalTrx(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p>
                  Tindakan pembatalan akan mengubah status menjadi <strong>Dibatalkan</strong> dan seluruh stok barang yang telah terjual pada pesanan ini akan <strong>otomatis dikembalikan ke gudang</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1.5">
                  Alasan Pembatalan Transaksi *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Salah input pesanan / Pelanggan membatalkan pesanan..."
                  className="w-full p-3 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs min-h-[90px]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalTrx(null)}
                  className="py-2 px-4 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel}
                  className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
                >
                  {isSubmittingCancel ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Konfirmasi Pembatalan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

