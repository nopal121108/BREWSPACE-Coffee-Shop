'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import { User } from '@/types';
import { formatRupiah } from '@/lib/utils';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, PieChart, Calendar } from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [period, setPeriod] = useState<string>('7days');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = (p: string) => {
    setLoading(true);
    fetch(`/api/admin/reports?period=${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReport(d.report);
      })
      .catch(() => showToast('Gagal memuat laporan.', 'error'))
      .finally(() => setLoading(false));
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
          showToast('Akses ditolak: Laporan Penjualan & Omzet hanya dapat diakses oleh Administrator.', 'error');
          router.push('/pos');
        } else {
          setUser(data.user);
          loadReport(period);
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    loadReport(newPeriod);
  };

  const summary = report?.summary || {};
  const dailyTrend = report?.dailyTrend || [];
  const maxRevenue = Math.max(...dailyTrend.map((d: any) => d.revenue || 0), 100000);

  return (
    <div className="flex h-screen overflow-hidden bg-coffee-100">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Laporan Analisis Omzet & Penjualan"
          subtitle="Analisis Pendapatan Harian, Average Order Value (AOV), dan Kontribusi Kategori"
          user={user}
        />

        <div className="p-8 space-y-6">
          {/* Period Selector Tabs */}
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-1.5 p-1 bg-white rounded-xl border border-coffee-200">
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: 'yesterday', label: 'Kemarin' },
                { id: '7days', label: '7 Hari Terakhir' },
                { id: 'this_month', label: 'Bulan Ini' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handlePeriodChange(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    period === tab.id
                      ? 'bg-coffee-600 text-white shadow-sm'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-coffee-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-stone-500 uppercase">
                Total Omzet Penjualan
              </span>
              <h3 className="text-xl font-bold font-display text-coffee-800 mt-1">
                {formatRupiah(summary.totalRevenue || 0)}
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-coffee-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-stone-500 uppercase">
                Total Transaksi
              </span>
              <h3 className="text-xl font-bold font-display text-stone-900 mt-1">
                {summary.totalTransactions || 0} Trx
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-coffee-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-stone-500 uppercase">
                Average Order Value (AOV)
              </span>
              <h3 className="text-xl font-bold font-display text-emerald-700 mt-1">
                {formatRupiah(summary.averageOrderValue || 0)}
              </h3>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-coffee-200/80 shadow-sm">
              <span className="text-[11px] font-semibold text-stone-500 uppercase">
                Total Cup/Item Terjual
              </span>
              <h3 className="text-xl font-bold font-display text-stone-900 mt-1">
                {summary.totalItemsSold || 0} Items
              </h3>
            </div>
          </div>

          {/* Chart & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Trend Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-coffee-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold font-display text-sm text-coffee-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-coffee-600" />
                  Grafik Penjualan Periode Terpilih
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Visualisasi kenaikan dan fluktuasi pendapatan
                </p>
              </div>

              <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-stone-100">
                {dailyTrend.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">
                    Tidak ada transaksi dalam rentang ini.
                  </div>
                ) : (
                  dailyTrend.map((d: any, idx: number) => {
                    const heightPercent = Math.max(Math.round((d.revenue / maxRevenue) * 100), 10);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        <div className="text-[10px] font-semibold text-stone-500 opacity-0 group-hover:opacity-100 transition truncate max-w-full">
                          {formatRupiah(d.revenue)}
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

            {/* Category Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-coffee-200/80 shadow-sm flex flex-col">
              <h3 className="font-bold font-display text-sm text-coffee-800 mb-1 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-coffee-600" />
                Kontribusi per Kategori
              </h3>
              <p className="text-xs text-stone-500 mb-4">Total porsi penjualan kelompok menu</p>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {report?.categoryBreakdown?.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-6">Tidak ada data.</p>
                ) : (
                  report?.categoryBreakdown?.map((cat: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-coffee-100 bg-coffee-50/30 flex justify-between items-center"
                    >
                      <div>
                        <h5 className="font-semibold text-xs text-stone-900">{cat.category_name}</h5>
                        <span className="text-[10px] text-stone-500">{cat.total_quantity} unit terjual</span>
                      </div>
                      <span className="font-bold font-mono text-xs text-coffee-800">
                        {formatRupiah(cat.total_revenue)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

