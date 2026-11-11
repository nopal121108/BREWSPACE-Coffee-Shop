'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import { StockMovement, User } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Boxes, History, PlusCircle, ArrowUpDown, X, AlertTriangle } from 'lucide-react';

export default function InventoryPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'stocks' | 'history'>('stocks');
  const [stocks, setStocks] = useState<any[]>([]);
  const [history, setHistory] = useState<StockMovement[]>([]);

  // Adjust Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [changeType, setChangeType] = useState<'restock' | 'adjustment'>('restock');
  const [direction, setDirection] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState('10');
  const [notes, setNotes] = useState('');

  const loadData = () => {
    fetch('/api/admin/stocks')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStocks(d.stocks || []);
      });

    fetch('/api/admin/stocks/history')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setHistory(d.history || []);
      });
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.user || data.user.role !== 'admin') {
          router.push('/pos');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/'));

    loadData();
  }, [router]);

  const openAdjustModal = (product: any, type: 'restock' | 'adjustment') => {
    setSelectedProduct(product);
    setChangeType(type);
    setDirection('add');
    setQuantity(type === 'restock' ? '20' : '5');
    setNotes(type === 'restock' ? 'Pengiriman stok dari supplier' : 'Penyesuaian stok opname');
    setIsModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity || parseInt(quantity, 10) <= 0) {
      showToast('Kuantitas stok tidak valid.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/admin/stocks/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          changeType,
          direction,
          quantity: parseInt(quantity, 10),
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Stok berhasil diperbarui.', 'success');
        setIsModalOpen(false);
        loadData();
      } else {
        showToast(data.error || 'Gagal mengubah stok.', 'error');
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
          title="Manajemen Stok & Audit Mutasi"
          subtitle="Pantau Persediaan Bahan & Jejak Riwayat Penjualan dan Restock"
          user={user}
        />

        <div className="p-8 space-y-6">
          {/* Tabs Navigation */}
          <div className="flex border-b border-coffee-200">
            <button
              onClick={() => setActiveTab('stocks')}
              className={`pb-3 px-4 font-semibold text-xs flex items-center gap-2 border-b-2 transition ${
                activeTab === 'stocks'
                  ? 'border-coffee-600 text-coffee-800'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              Status Persediaan Saat Ini
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 px-4 font-semibold text-xs flex items-center gap-2 border-b-2 transition ${
                activeTab === 'history'
                  ? 'border-coffee-600 text-coffee-800'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <History className="w-4 h-4" />
              Log Audit Mutasi Stok (100 Terakhir)
            </button>
          </div>

          {activeTab === 'stocks' ? (
            /* Current Stock Table */
            <div className="bg-white rounded-2xl border border-coffee-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-coffee-50 border-b border-coffee-200 text-coffee-800 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Nama Produk</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Stok Saat Ini</th>
                    <th className="py-3 px-4">Min. Stok</th>
                    <th className="py-3 px-4">Status Kondisi</th>
                    <th className="py-3 px-4 text-right">Tindakan Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {stocks.map((item) => (
                    <tr key={item.id} className="hover:bg-coffee-50/40 transition">
                      <td className="py-3 px-4 font-semibold text-stone-900">{item.name}</td>
                      <td className="py-3 px-4 text-stone-500">{item.category_name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-sm">
                        <span
                          className={
                            item.stock_status === 'out_of_stock'
                              ? 'text-rose-600'
                              : item.stock_status === 'low_stock'
                              ? 'text-amber-600'
                              : 'text-stone-800'
                          }
                        >
                          {item.stock} pcs
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-500">{item.min_stock} pcs</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.stock_status === 'out_of_stock'
                              ? 'bg-rose-100 text-rose-700'
                              : item.stock_status === 'low_stock'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.stock_status === 'out_of_stock'
                            ? 'Habis'
                            : item.stock_status === 'low_stock'
                            ? 'Menipis'
                            : 'Aman'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openAdjustModal(item, 'restock')}
                            className="py-1 px-2.5 rounded-lg bg-coffee-600 hover:bg-coffee-700 text-white font-semibold text-[11px] flex items-center gap-1 transition"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            Restock
                          </button>
                          <button
                            onClick={() => openAdjustModal(item, 'adjustment')}
                            className="py-1 px-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold text-[11px] flex items-center gap-1 transition"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                            Koreksi
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Audit Log History */
            <div className="bg-white rounded-2xl border border-coffee-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-coffee-50 border-b border-coffee-200 text-coffee-800 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Produk</th>
                    <th className="py-3 px-4">Tipe Mutasi</th>
                    <th className="py-3 px-4 text-center">Perubahan</th>
                    <th className="py-3 px-4 text-center">Sebelum &rarr; Sesudah</th>
                    <th className="py-3 px-4">Operator & Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-mono">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-coffee-50/40 transition">
                      <td className="py-3 px-4 text-stone-500 font-sans text-[11px]">
                        {formatDateTime(h.created_at)}
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold text-stone-900">
                        {h.product_name}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            h.change_type === 'sale'
                              ? 'bg-blue-50 text-blue-700'
                              : h.change_type === 'restock'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {h.change_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={h.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {h.quantity_change > 0 ? `+${h.quantity_change}` : h.quantity_change}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-stone-600">
                        {h.previous_stock} &rarr;{' '}
                        <strong className="text-stone-900">{h.current_stock}</strong>
                      </td>
                      <td className="py-3 px-4 font-sans text-[11px]">
                        <span className="font-semibold text-stone-800">{h.created_by}</span>
                        <span className="text-stone-400 block">{h.notes || '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Restock / Adjust Modal */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="px-6 py-4 bg-coffee-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm font-display">
                {changeType === 'restock' ? 'Restock Barang Masuk' : 'Koreksi Stok Manual'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-stone-300 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <p className="text-stone-500">Produk:</p>
                <p className="text-sm font-bold text-stone-900">{selectedProduct.name}</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Stok saat ini:{' '}
                  <strong className="text-coffee-800">{selectedProduct.stock} pcs</strong>
                </p>
              </div>

              {changeType === 'adjustment' && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Arah Penyesuaian</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('add')}
                      className={`py-1.5 rounded-lg font-semibold border ${
                        direction === 'add'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-stone-600 border-stone-300'
                      }`}
                    >
                      + Tambah Unit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('subtract')}
                      className={`py-1.5 rounded-lg font-semibold border ${
                        direction === 'subtract'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-stone-600 border-stone-300'
                      }`}
                    >
                      - Kurang Unit
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Jumlah Unit *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Catatan Alasan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Barang kadaluarsa / Supplier kirim 2 box"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-coffee-600 hover:bg-coffee-700 text-white font-semibold shadow-sm"
                >
                  Konfirmasi Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

