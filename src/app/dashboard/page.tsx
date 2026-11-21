'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ReceiptModal from '@/components/ReceiptModal';
import { useToast } from '@/components/Toast';
import { User } from '@/types';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import {
  DollarSign,
  ShoppingCart,
  Coffee,
  AlertTriangle,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  Eye
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('brewspace_token') : null;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('/api/auth/me', { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.user) {
          router.push('/');
        } else if (data.user.role !== 'admin') {
          showToast('Akses ditolak: Dashboard hanya dapat diakses oleh Administrator.', 'error');
          router.push('/pos');
        } else {
          setUser(data.user);
          // Only admin loads stats
          fetch('/api/admin/dashboard', { headers: authHeaders })
            .then((res) => res.json())
            .then((d) => {
              if (d.success) {
                setStats(d.stats);
              } else {
                showToast(d.error || 'Gagal memuat statistik.', 'error');
              }
            })
            .catch(() => showToast('Kesalahan saat memuat data dashboard.', 'error'))
            .finally(() => setLoading(false));
        }
      })
      .catch(() => router.push('/'));
  }, [router, showToast]);

  const viewReceipt = async (id: number) => {
    try {
      const res = await fetch(`/api/pos/receipt/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedReceipt(data.receipt);
      }
    } catch {
      showToast('Gagal memuat struk transaksi.', 'error');
    }
  };

  const salesTrend = stats?.salesChart7Days || [];
  const maxRevenue = Math.max(...salesTrend.map((d: any) => d.daily_revenue || 0), 100000);

  return (
    <div className="flex h-screen overflow-hidden bg-coffee-100">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Dashboard Ringkasan Operasional"
          subtitle="Pantau Metrik Omzet, Produk Terlaris, dan Stok Kritis Secara Real-time"
          user={user}
        />

        <div className="p-8 space-y-8">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-2xl border border-coffee-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Total Pendapatan
                </p>
                <h3 className="text-xl font-bold font-display text-coffee-800 mt-0.5">
                  {formatRupiah(stats?.totalRevenue || 0)}
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-coffee-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Total Transaksi
                </p>
                <h3 className="text-xl font-bold font-display text-stone-900 mt-0.5">
                  {stats?.totalTransactions || 0} Trx
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-coffee-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-coffee-50 text-coffee-600 flex items-center justify-center shrink-0">
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Menu Produk Aktif
                </p>
                <h3 className="text-xl font-bold font-display text-stone-900 mt-0.5">
                  {stats?.activeProducts || 0} Menu
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-coffee-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Peringatan Stok
                </p>
                <h3 className="text-xl font-bold font-display text-rose-600 mt-0.5">
                  {stats?.lowStockCount || 0} Item
                </h3>
              </div>
            </div>
          </div>

          {/* Middle: 7 Days Trend Chart & Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Trend (2 Columns) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-coffee-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold font-display text-base text-coffee-800 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-coffee-600" />
                    Tren Penjualan (7 Hari Terakhir)
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Grafik pendapatan harian coffee shop
                  </p>
                </div>
              </div>

              {/* Chart Bars */}
              <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-stone-100">
                {salesTrend.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                    Belum ada data transaksi dalam 7 hari terakhir.
                  </div>
                ) : (
                  salesTrend.map((d: any, idx: number) => {
                    const heightPercent = Math.max(Math.round((d.daily_revenue / maxRevenue) * 100), 8);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        <div className="text-[10px] font-semibold text-stone-500 opacity-0 group-hover:opacity-100 transition truncate max-w-full">
                          {formatRupiah(d.daily_revenue)}
                        </div>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[42px] bg-gradient-to-t from-coffee-700 to-coffee-500 rounded-t-lg transition-all group-hover:brightness-110 shadow-sm"
                        ></div>
                        <span className="text-[11px] font-medium text-stone-500 font-mono">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Top 5 Products (1 Column) */}
            <div className="bg-white p-6 rounded-2xl border border-coffee-200/80 shadow-sm flex flex-col">
              <h3 className="font-bold font-display text-base text-coffee-800 mb-1 flex items-center gap-2">
                <Coffee className="w-4 h-4 text-coffee-600" />
                Menu Terlaris (Top 5)
              </h3>
              <p className="text-xs text-stone-500 mb-4">Produk dengan kuantitas penjualan tertinggi</p>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {stats?.topProducts?.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-8">Belum ada data penjualan.</p>
                ) : (
                  stats?.topProducts?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-coffee-100 bg-coffee-50/40"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-coffee-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-semibold text-stone-900">{item.product_name}</h4>
                          <span className="text-[10px] text-stone-500">{item.category_name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-coffee-800">{item.total_sold} pcs</div>
                        <div className="text-[10px] text-stone-500">{formatRupiah(item.total_revenue)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Grid: Low Stock Alert & Recent Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Low Stock Warning */}
            <div className="bg-white p-6 rounded-2xl border border-coffee-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <h3 className="font-bold font-display text-base text-stone-900">
                    Peringatan Stok Menipis
                  </h3>
                </div>
                <button
                  onClick={() => router.push('/inventory')}
                  className="text-xs text-coffee-600 hover:text-coffee-800 font-semibold flex items-center gap-1"
                >
                  Restock di Inventaris <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {stats?.lowStockProducts?.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-xs text-center font-medium">
                    Semua stok produk berada di batas aman.
                  </div>
                ) : (
                  stats?.lowStockProducts?.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-rose-50/50"
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-stone-900">{p.name}</h4>
                        <span className="text-[10px] text-stone-500">Min. Stok: {p.min_stock} pcs</span>
                      </div>
                      <div className="text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm">
                          Sisa {p.stock}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white p-6 rounded-2xl border border-coffee-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-coffee-600" />
                  <h3 className="font-bold font-display text-base text-stone-900">
                    Feed Transaksi Terbaru
                  </h3>
                </div>
                <button
                  onClick={() => router.push('/transactions')}
                  className="text-xs text-coffee-600 hover:text-coffee-800 font-semibold flex items-center gap-1"
                >
                  Lihat Semua <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {stats?.recentTransactions?.length === 0 ? (
                  <div className="text-xs text-stone-400 text-center py-6">Belum ada transaksi.</div>
                ) : (
                  stats?.recentTransactions?.map((t: any) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-stone-200/80 bg-white hover:bg-stone-50 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-coffee-800">
                            {t.invoice_number}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-600 uppercase">
                            {t.payment_method}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {formatDateTime(t.created_at)} • Kasir: {t.cashier_name}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-stone-900 font-mono">
                          {formatRupiah(t.total_amount)}
                        </span>
                        <button
                          onClick={() => viewReceipt(t.id)}
                          className="p-1.5 rounded-lg border border-stone-200 hover:bg-coffee-100 text-coffee-700 transition"
                          title="Lihat Struk"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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

