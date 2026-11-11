'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ReceiptModal from '@/components/ReceiptModal';
import { useToast } from '@/components/Toast';
import { Transaction, User } from '@/types';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { Search, Calendar, Eye, Receipt, FileText } from 'lucide-react';

export default function TransactionsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

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
    fetch('/api/auth/me')
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
                  <th className="py-3 px-4 text-right">Total Transaksi</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400">
                      Tidak ada transaksi yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-coffee-50/40 transition">
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
                      <td className="py-3 px-4 font-mono font-bold text-right text-stone-900">
                        {formatRupiah(t.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => viewReceipt(t.id)}
                          className="py-1 px-3 rounded-lg border border-coffee-200 hover:bg-coffee-50 text-coffee-700 font-semibold text-[11px] inline-flex items-center gap-1.5 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Lihat Struk
                        </button>
                      </td>
                    </tr>
                  ))
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
    </div>
  );
}

