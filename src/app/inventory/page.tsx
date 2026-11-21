'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import { StockMovement, User } from '@/types';
import { formatDateTime } from '@/lib/utils';
import {
  Boxes,
  PlusCircle,
  Search,
  X,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ShoppingBag
} from 'lucide-react';

export default function InventoryPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [stocks, setStocks] = useState<any[]>([]);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'restock' | 'adjustment' | 'sale'>('all');

  // Restock Modal State
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockProductId, setRestockProductId] = useState<number | ''>('');
  const [restockQty, setRestockQty] = useState<string>('10');
  const [restockNotes, setRestockNotes] = useState<string>('');
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // Koreksi Modal State
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [correctionProductId, setCorrectionProductId] = useState<number | ''>('');
  const [actualStock, setActualStock] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  const loadData = () => {
    fetch('/api/admin/stocks')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStocks(d.stocks || []);
      })
      .catch(() => {});

    fetch('/api/admin/stocks/history')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setHistory(d.history || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('brewspace_token') : null;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('/api/auth/me', { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.user) {
          router.push('/');
        } else if (data.user.role !== 'admin') {
          showToast('Akses ditolak: Manajemen Stok hanya dapat diakses oleh Administrator.', 'error');
          router.push('/pos');
        } else {
          setUser(data.user);
          loadData();
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  // Selected products for modals
  const selectedRestockProduct = useMemo(() => {
    return stocks.find((s) => s.id === Number(restockProductId)) || null;
  }, [stocks, restockProductId]);

  const selectedCorrectionProduct = useMemo(() => {
    return stocks.find((s) => s.id === Number(correctionProductId)) || null;
  }, [stocks, correctionProductId]);

  // Open Restock Modal (Optionally pre-fill product)
  const openRestock = (product?: any) => {
    if (product) {
      setRestockProductId(product.id);
    } else if (stocks.length > 0 && !restockProductId) {
      setRestockProductId(stocks[0].id);
    }
    setRestockQty('10');
    setRestockNotes('');
    setIsRestockOpen(true);
  };

  // Open Koreksi Modal (Optionally pre-fill product)
  const openCorrection = (product?: any) => {
    if (product) {
      setCorrectionProductId(product.id);
      setActualStock(String(product.stock));
    } else if (stocks.length > 0) {
      const target = stocks.find((s) => s.id === Number(correctionProductId)) || stocks[0];
      setCorrectionProductId(target.id);
      setActualStock(String(target.stock));
    }
    setCorrectionReason('');
    setIsCorrectionOpen(true);
  };

  // Handle Restock Submit
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProductId) {
      showToast('Pilih bahan baku yang ingin di-restock.', 'error');
      return;
    }
    const qty = parseInt(restockQty, 10);
    if (!qty || isNaN(qty) || qty <= 0) {
      showToast('Masukkan jumlah stok masuk yang valid (minimal 1 unit).', 'error');
      return;
    }

    setIsSubmittingRestock(true);
    try {
      const res = await fetch('/api/admin/stocks/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(restockProductId),
          changeType: 'restock',
          quantity: qty,
          notes: restockNotes.trim() || 'Restock bahan masuk',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Restock berhasil disimpan.', 'success');
        setIsRestockOpen(false);
        loadData();
      } else {
        showToast(data.error || 'Gagal menyimpan restock.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Handle Correction Submit
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionProductId) {
      showToast('Pilih bahan baku yang ingin dikoreksi.', 'error');
      return;
    }
    const actual = parseInt(actualStock, 10);
    if (isNaN(actual) || actual < 0) {
      showToast('Stok fisik sebenarnya tidak boleh bernilai negatif.', 'error');
      return;
    }
    if (!correctionReason.trim()) {
      showToast('Harap masukkan alasan koreksi stok fisik.', 'error');
      return;
    }

    setIsSubmittingCorrection(true);
    try {
      const res = await fetch('/api/admin/stocks/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(correctionProductId),
          changeType: 'adjustment',
          actualStock: actual,
          notes: `Koreksi Fisik (Opname): ${correctionReason.trim()}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Koreksi stok berhasil diperbarui.', 'success');
        setIsCorrectionOpen(false);
        loadData();
      } else {
        showToast(data.error || 'Gagal menyimpan koreksi stok.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan.', 'error');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Filtered stocks & history
  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const q = searchProduct.toLowerCase().trim();
      return !q || s.name.toLowerCase().includes(q) || (s.category_name && s.category_name.toLowerCase().includes(q));
    });
  }, [stocks, searchProduct]);

  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      if (historyFilter === 'all') return true;
      if (historyFilter === 'restock') return h.change_type === 'restock';
      if (historyFilter === 'adjustment') return h.change_type === 'adjustment';
      if (historyFilter === 'sale') return h.change_type === 'sale';
      return true;
    });
  }, [history, historyFilter]);

  // Counts
  const lowCount = stocks.filter((s) => s.stock_status === 'low_stock').length;
  const outCount = stocks.filter((s) => s.stock_status === 'out_of_stock').length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F1E8]">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Stok & Mutasi Bahan"
          subtitle="Kelola penambahan stok masuk dan rekonsiliasi opname fisik secara mudah"
          user={user}
        />

        <div className="p-8 space-y-6 max-w-7xl">
          {/* Stat Cards & Quick Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E0D5] shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#F2EDE6] text-[#6F4E37] flex items-center justify-center text-xl font-bold">
                📦
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6B645D] uppercase tracking-wider">Total Bahan / Menu</p>
                <p className="text-2xl font-bold text-[#282522]">{stocks.length}</p>
                <p className="text-[11px] text-[#968D84]">Terdaftar di sistem</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E0D5] shadow-xs flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${lowCount > 0 ? 'bg-[#FFF8E1] text-[#B78103]' : 'bg-[#EDF7EE] text-[#1B5E20]'}`}>
                ⚠️
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6B645D] uppercase tracking-wider">Stok Menipis</p>
                <p className={`text-2xl font-bold ${lowCount > 0 ? 'text-[#B78103]' : 'text-[#1B5E20]'}`}>{lowCount}</p>
                <p className="text-[11px] text-[#968D84]">Mendekati batas aman</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E0D5] shadow-xs flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${outCount > 0 ? 'bg-[#FDEDEC] text-[#C62828]' : 'bg-[#EDF7EE] text-[#1B5E20]'}`}>
                ⛔
              </div>
              <div>
                <p className="text-xs font-semibold text-[#6B645D] uppercase tracking-wider">Stok Habis</p>
                <p className={`text-2xl font-bold ${outCount > 0 ? 'text-[#C62828]' : 'text-[#1B5E20]'}`}>{outCount}</p>
                <p className="text-[11px] text-[#968D84]">Perlu restock segera</p>
              </div>
            </div>

            {/* Dua Tombol Aksi Utama */}
            <div className="bg-white p-4 rounded-2xl border border-[#E8E0D5] shadow-xs flex flex-col justify-center gap-2">
              <button
                onClick={() => openRestock()}
                className="w-full py-2.5 px-4 rounded-xl bg-[#6F4E37] hover:bg-[#5A3E2B] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Restock Masuk</span>
              </button>
              <button
                onClick={() => openCorrection()}
                className="w-full py-2.5 px-4 rounded-xl border border-[#DED5C8] hover:bg-[#F5F1E8] text-[#282522] font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <Boxes className="w-4 h-4 text-[#6F4E37]" />
                <span>Koreksi Stok Fisik</span>
              </button>
            </div>
          </div>

          {/* Section 1: Tabel Stok Persediaan Bahan Saat Ini */}
          <div className="bg-white rounded-2xl border border-[#E8E0D5] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E8E0D5] flex flex-wrap items-center justify-between gap-3 bg-[#FCFAF7]">
              <div>
                <h3 className="font-bold text-sm text-[#282522] flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#6F4E37]" />
                  <span>Daftar Stok Bahan & Produk</span>
                </h3>
                <p className="text-xs text-[#6B645D]">Jumlah stok yang tercatat secara real-time di sistem</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#968D84]" />
                <input
                  type="text"
                  placeholder="Cari nama bahan / menu..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#DED5C8] focus:outline-none focus:border-[#6F4E37] bg-white text-[#282522]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E8E0D5] text-[#6B645D] uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Nama Bahan / Menu</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-center">Stok Sistem</th>
                    <th className="py-3 px-4 text-center">Batas Minimum</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE1]">
                  {filteredStocks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#6B645D]">
                        Tidak ada bahan atau produk yang cocok dengan pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredStocks.map((item) => (
                      <tr key={item.id} className="hover:bg-[#FAF6F0] transition">
                        <td className="py-3 px-4 font-semibold text-[#282522]">{item.name}</td>
                        <td className="py-3 px-4 text-[#6B645D]">{item.category_name}</td>
                        <td className="py-3 px-4 text-center font-bold text-sm">
                          <span
                            className={
                              item.stock <= 0
                                ? 'text-rose-600'
                                : item.stock <= item.min_stock
                                ? 'text-amber-600'
                                : 'text-[#282522]'
                            }
                          >
                            {item.stock} unit
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-[#968D84]">{item.min_stock} unit</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.stock <= 0
                                ? 'bg-[#FDEDEC] text-[#C62828] border border-[#FFCDD2]'
                                : item.stock <= item.min_stock
                                ? 'bg-[#FFF8E1] text-[#B78103] border border-[#FFE082]'
                                : 'bg-[#EDF7EE] text-[#1B5E20] border border-[#C8E6C9]'
                            }`}
                          >
                            {item.stock <= 0 ? 'Habis' : item.stock <= item.min_stock ? 'Menipis' : 'Aman'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openRestock(item)}
                              className="py-1 px-2.5 rounded-lg bg-[#6F4E37] hover:bg-[#5A3E2B] text-white font-semibold text-[11px] inline-flex items-center gap-1 transition"
                              title="Tambah stok masuk"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Restock</span>
                            </button>
                            <button
                              onClick={() => openCorrection(item)}
                              className="py-1 px-2.5 rounded-lg border border-[#DED5C8] hover:bg-[#F5F1E8] text-[#282522] font-semibold text-[11px] inline-flex items-center gap-1 transition"
                              title="Sesuaikan dengan hitung fisik"
                            >
                              <Boxes className="w-3.5 h-3.5 text-[#6F4E37]" />
                              <span>Koreksi</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Riwayat Lengkap Mutasi Stok (Terpadu) */}
          <div className="bg-white rounded-2xl border border-[#E8E0D5] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E8E0D5] flex flex-wrap items-center justify-between gap-3 bg-[#FCFAF7]">
              <div>
                <h3 className="font-bold text-sm text-[#282522] flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#6F4E37]" />
                  <span>Riwayat Mutasi Stok (Audit Log Terpadu)</span>
                </h3>
                <p className="text-xs text-[#6B645D]">
                  Mencatat seluruh aktivitas Restock, Koreksi Fisik, dan Pengurangan Penjualan secara otomatis
                </p>
              </div>

              {/* Filter Aktivitas */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setHistoryFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    historyFilter === 'all'
                      ? 'bg-[#6F4E37] text-white'
                      : 'bg-white border border-[#DED5C8] text-[#6B645D] hover:bg-[#F5F1E8]'
                  }`}
                >
                  Semua ({history.length})
                </button>
                <button
                  onClick={() => setHistoryFilter('restock')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    historyFilter === 'restock'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-[#DED5C8] text-[#6B645D] hover:bg-[#F5F1E8]'
                  }`}
                >
                  Restock
                </button>
                <button
                  onClick={() => setHistoryFilter('adjustment')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    historyFilter === 'adjustment'
                      ? 'bg-amber-700 text-white'
                      : 'bg-white border border-[#DED5C8] text-[#6B645D] hover:bg-[#F5F1E8]'
                  }`}
                >
                  Koreksi
                </button>
                <button
                  onClick={() => setHistoryFilter('sale')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    historyFilter === 'sale'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white border border-[#DED5C8] text-[#6B645D] hover:bg-[#F5F1E8]'
                  }`}
                >
                  Penjualan
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#E8E0D5] text-[#6B645D] uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Tanggal & Waktu</th>
                    <th className="py-3 px-4">Nama Bahan / Produk</th>
                    <th className="py-3 px-4">Jenis Aktivitas</th>
                    <th className="py-3 px-4 text-center">Perubahan</th>
                    <th className="py-3 px-4 text-center">Sebelum ➔ Sesudah</th>
                    <th className="py-3 px-4">Keterangan / Alasan</th>
                    <th className="py-3 px-4 text-right">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE1]">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6B645D]">
                        Belum ada catatan riwayat mutasi stok.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((h) => {
                      const isPositive = h.quantity_change > 0;
                      let badgeColor = 'bg-stone-100 text-stone-700 border-stone-200';
                      let label = 'Penyesuaian';
                      let icon = '⚖️';

                      if (h.change_type === 'restock') {
                        badgeColor = 'bg-[#EDF7EE] text-[#1B5E20] border-[#C8E6C9]';
                        label = 'Restock Masuk';
                        icon = '🟢';
                      } else if (h.change_type === 'adjustment') {
                        badgeColor = 'bg-[#FFF8E1] text-[#B78103] border-[#FFE082]';
                        label = 'Koreksi Fisik';
                        icon = '⚖️';
                      } else if (h.change_type === 'sale') {
                        badgeColor = 'bg-[#E8F4FD] text-[#0D47A1] border-[#BBDEFB]';
                        label = 'Penjualan Kasir';
                        icon = '🛒';
                      } else if (h.change_type === 'cancellation') {
                        badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                        label = 'Void Transaksi';
                        icon = '↩️';
                      } else if (h.change_type === 'initial') {
                        badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                        label = 'Stok Awal';
                        icon = '📦';
                      }

                      return (
                        <tr key={h.id} className="hover:bg-[#FAF6F0] transition">
                          <td className="py-3 px-4 text-[#6B645D] font-mono text-[11px]">
                            {formatDateTime(h.created_at)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#282522]">{h.product_name}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}
                            >
                              <span>{icon}</span>
                              <span>{label}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-sm">
                            <span className={isPositive ? 'text-emerald-700' : 'text-rose-600'}>
                              {isPositive ? `+${h.quantity_change}` : h.quantity_change}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-[#6B645D] font-mono">
                            {h.previous_stock} ➔ <strong className="text-[#282522]">{h.current_stock}</strong>
                          </td>
                          <td className="py-3 px-4 text-[#6B645D] max-w-xs truncate" title={h.notes || '-'}>
                            {h.notes || h.reference_id || '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-[#282522]">{h.created_by}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: RESTOCK STOK MASUK (Sederhana & Spesifik)        */}
      {/* ======================================================== */}
      {isRestockOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-[#E8E0D5]">
            <div className="px-6 py-4 bg-[#6F4E37] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>➕</span>
                  <span>Restock Bahan / Produk</span>
                </h3>
                <p className="text-[11px] text-[#DED5C8]">Catat penambahan stok dari pengadaan atau supplier</p>
              </div>
              <button onClick={() => setIsRestockOpen(false)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRestockSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#282522] mb-1">Pilih Bahan / Produk *</label>
                <select
                  value={restockProductId}
                  onChange={(e) => setRestockProductId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#DED5C8] focus:border-[#6F4E37] focus:outline-none bg-white text-xs font-medium text-[#282522]"
                  required
                >
                  <option value="">-- Pilih Bahan Baku / Produk --</option>
                  {stocks.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok saat ini: {p.stock} unit)
                    </option>
                  ))}
                </select>
              </div>

              {selectedRestockProduct && (
                <div className="p-3 bg-[#F5F1E8] rounded-xl border border-[#E8E0D5] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#6B645D]">Stok saat ini di sistem:</span>
                    <p className="font-bold text-sm text-[#282522]">{selectedRestockProduct.stock} unit</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-emerald-800 font-medium">Estimasi setelah restock:</span>
                    <p className="font-bold text-sm text-emerald-700">
                      {selectedRestockProduct.stock + (parseInt(restockQty, 10) || 0)} unit
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#282522] mb-1">Jumlah Stok Masuk (+) *</label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  placeholder="Contoh: 20"
                  className="w-full px-3 py-2 rounded-xl border border-[#DED5C8] focus:border-[#6F4E37] focus:outline-none font-bold text-sm text-[#282522]"
                  required
                />
                <p className="text-[11px] text-[#968D84] mt-1">Stok akan langsung ditambahkan ke jumlah persediaan.</p>
              </div>

              <div>
                <label className="block font-semibold text-[#282522] mb-1">Catatan / Supplier (Opsional)</label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="Contoh: Kiriman Roastery Batch #40 / No. Faktur PO-99"
                  className="w-full px-3 py-2 rounded-xl border border-[#DED5C8] focus:border-[#6F4E37] focus:outline-none text-xs text-[#282522]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E0D5]">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="py-2 px-4 rounded-xl border border-[#DED5C8] hover:bg-[#F5F1E8] font-medium text-[#282522]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestock}
                  className="py-2 px-5 rounded-xl bg-[#6F4E37] hover:bg-[#5A3E2B] text-white font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingRestock ? 'Menyimpan...' : 'Simpan Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: KOREKSI STOK FISIK (Hitung Selisih Otomatis)     */}
      {/* ======================================================== */}
      {isCorrectionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-[#E8E0D5]">
            <div className="px-6 py-4 bg-[#282522] text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>⚖️</span>
                  <span>Koreksi Stok Fisik (Opname)</span>
                </h3>
                <p className="text-[11px] text-[#DED5C8]">Sesuaikan stok sistem dengan hasil hitung fisik nyata</p>
              </div>
              <button onClick={() => setIsCorrectionOpen(false)} className="text-white/80 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#282522] mb-1">Pilih Bahan / Produk *</label>
                <select
                  value={correctionProductId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setCorrectionProductId(id);
                    const p = stocks.find((item) => item.id === id);
                    if (p) setActualStock(String(p.stock));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#DED5C8] focus:border-[#6F4E37] focus:outline-none bg-white text-xs font-medium text-[#282522]"
                  required
                >
                  <option value="">-- Pilih Bahan Baku / Produk --</option>
                  {stocks.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok sistem: {p.stock} unit)
                    </option>
                  ))}
                </select>
              </div>

              {selectedCorrectionProduct && (
                <div className="p-3 bg-[#F5F1E8] rounded-xl border border-[#E8E0D5] space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#6B645D]">Stok tercatat di sistem:</span>
                    <span className="font-bold text-[#282522] text-sm">{selectedCorrectionProduct.stock} unit</span>
                  </div>

                  {actualStock !== '' && !isNaN(parseInt(actualStock, 10)) && (
                    <div className="pt-2 border-t border-[#E8E0D5] flex justify-between items-center text-xs">
                      <span className="text-[#6B645D]">Selisih yang akan disesuaikan:</span>
                      {(() => {
                        const diff = parseInt(actualStock, 10) - selectedCorrectionProduct.stock;
                        if (diff > 0) {
                          return (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              +{diff} unit (Stok Bertambah)
                            </span>
                          );
                        } else if (diff < 0) {
                          return (
                            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              {diff} unit (Stok Berkurang)
                            </span>
                          );
                        } else {
                          return (
                            <span className="font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                              0 unit (Stok Sama)
                            </span>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#282522] mb-1">Jumlah Stok Fisik Sebenarnya *</label>
                <input
                  type="number"
                  min="0"
                  value={actualStock}
                  onChange={(e) => setActualStock(e.target.value)}
                  placeholder="Masukkan jumlah yang dihitung di gudang"
                  className="w-full px-3 py-2 rounded-xl border border-[#DED5C8] focus:border-[#6F4E37] focus:outline-none font-bold text-sm text-[#282522]"
                  required
                />
                <p className="text-[11px] text-[#968D84] mt-1">
                  Sistem akan otomatis menghitung selisih dan mengganti stok sistem dengan angka ini.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-[#282522] mb-1">Alasan Koreksi Fisik *</label>
                <input
                  type="text"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="Contoh: Barang tumpah / Selisih opname fisik mingguan"
                  className="w-full px-3 py-2 rounded-xl border border-[#DED5C8] focus:border-[#6F4E37] focus:outline-none text-xs text-[#282522]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E8E0D5]">
                <button
                  type="button"
                  onClick={() => setIsCorrectionOpen(false)}
                  className="py-2 px-4 rounded-xl border border-[#DED5C8] hover:bg-[#F5F1E8] font-medium text-[#282522]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection}
                  className="py-2 px-5 rounded-xl bg-[#282522] hover:bg-[#1a1816] text-white font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingCorrection ? 'Menyimpan...' : 'Simpan Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
