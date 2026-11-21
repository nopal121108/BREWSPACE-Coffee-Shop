'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import { User, CustomerOrder, OrderStatus } from '@/types';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  BellRing,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  Coffee,
  Check,
  X,
  ArrowRight,
  User as UserIcon,
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function CashierOrderApprovalPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('menunggu_konfirmasi');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Processing state for actions
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject Modal state
  const [rejectingOrder, setRejectingOrder] = useState<CustomerOrder | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Bahan baku menu tertentu sedang habis.');

  // Check cashier authentication
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.user) {
          router.push('/');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  // Fetch all orders
  const fetchOrders = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch {
      if (!silent) showToast('Gagal memuat daftar pesanan.', 'error');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Real-time polling every 3 seconds for new orders
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update order status action
  const handleUpdateStatus = async (
    orderId: string,
    action: 'confirm' | 'reject' | 'prepare' | 'ready' | 'complete',
    customReason?: string
  ) => {
    setProcessingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectedReason: customReason
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memperbarui status pesanan.');
      }

      showToast(data.message || 'Status pesanan berhasil diperbarui.', 'success');
      setRejectingOrder(null);
      fetchOrders(true);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status pesanan.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Counts per category
  const counts = useMemo(() => {
    return {
      all: orders.length,
      menunggu_konfirmasi: orders.filter((o) => o.status === 'menunggu_konfirmasi').length,
      dikonfirmasi: orders.filter((o) => o.status === 'dikonfirmasi').length,
      sedang_disiapkan: orders.filter((o) => o.status === 'sedang_disiapkan').length,
      siap_diambil: orders.filter((o) => o.status === 'siap_diambil').length,
      selesai: orders.filter((o) => o.status === 'selesai').length,
      ditolak_dibatalkan: orders.filter((o) => o.status === 'ditolak' || o.status === 'dibatalkan').length
    };
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      let matchTab = true;
      if (activeCategoryTab === 'menunggu_konfirmasi') matchTab = o.status === 'menunggu_konfirmasi';
      else if (activeCategoryTab === 'dikonfirmasi') matchTab = o.status === 'dikonfirmasi';
      else if (activeCategoryTab === 'sedang_disiapkan') matchTab = o.status === 'sedang_disiapkan';
      else if (activeCategoryTab === 'siap_diambil') matchTab = o.status === 'siap_diambil';
      else if (activeCategoryTab === 'selesai') matchTab = o.status === 'selesai';
      else if (activeCategoryTab === 'ditolak_dibatalkan') matchTab = o.status === 'ditolak' || o.status === 'dibatalkan';

      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        !query ||
        o.orderNumber.toLowerCase().includes(query) ||
        o.customerName.toLowerCase().includes(query) ||
        (o.tableNumber && o.tableNumber.toLowerCase().includes(query));

      return matchTab && matchSearch;
    });
  }, [orders, activeCategoryTab, searchQuery]);

  // Render Status Badge
  const renderBadge = (status: OrderStatus) => {
    switch (status) {
      case 'menunggu_konfirmasi':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Menunggu Konfirmasi
          </span>
        );
      case 'dikonfirmasi':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            Dikonfirmasi
          </span>
        );
      case 'sedang_disiapkan':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <ChefHat className="w-3.5 h-3.5 text-indigo-600" />
            Sedang Disiapkan
          </span>
        );
      case 'siap_diambil':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <BellRing className="w-3.5 h-3.5 text-emerald-600" />
            Siap Diambil
          </span>
        );
      case 'selesai':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">
            <Check className="w-3.5 h-3.5 text-stone-500" />
            Selesai
          </span>
        );
      case 'ditolak':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Ditolak
          </span>
        );
      case 'dibatalkan':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-500 border border-stone-200">
            <RotateCcw className="w-3.5 h-3.5" />
            Dibatalkan Pelanggan
          </span>
        );
      default:
        return null;
    }
  };

  const tabs = [
    { key: 'menunggu_konfirmasi', label: 'Menunggu Konfirmasi', count: counts.menunggu_konfirmasi, icon: Clock, badgeColor: 'bg-amber-500 text-white' },
    { key: 'dikonfirmasi', label: 'Dikonfirmasi', count: counts.dikonfirmasi, icon: CheckCircle2, badgeColor: 'bg-blue-600 text-white' },
    { key: 'sedang_disiapkan', label: 'Sedang Disiapkan', count: counts.sedang_disiapkan, icon: ChefHat, badgeColor: 'bg-indigo-600 text-white' },
    { key: 'siap_diambil', label: 'Siap Diambil', count: counts.siap_diambil, icon: BellRing, badgeColor: 'bg-emerald-600 text-white' },
    { key: 'selesai', label: 'Selesai', count: counts.selesai, icon: Check, badgeColor: 'bg-stone-500 text-white' },
    { key: 'ditolak_dibatalkan', label: 'Dibatalkan / Ditolak', count: counts.ditolak_dibatalkan, icon: XCircle, badgeColor: 'bg-rose-500 text-white' },
    { key: 'all', label: 'Semua Pesanan', count: counts.all, icon: Filter, badgeColor: 'bg-stone-300 text-stone-800' }
  ];

  return (
    <div className="flex h-screen bg-[#F5F1E8] overflow-hidden">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Persetujuan Pesanan (Order Approval)"
          subtitle="Verifikasi dan tindak lanjuti pesanan masuk dari pelanggan secara real-time"
          user={user}
        />

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-[#DED5C8] shadow-xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Total Masuk</span>
              <span className="text-xl font-bold text-[#282522] mt-1 block">{counts.all}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-amber-300 bg-amber-50/40 shadow-xs">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block flex items-center gap-1">
                <Clock className="w-3 h-3" /> Menunggu
              </span>
              <span className="text-xl font-bold text-amber-800 mt-1 block">{counts.menunggu_konfirmasi}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs">
              <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">Dikonfirmasi</span>
              <span className="text-xl font-bold text-blue-800 mt-1 block">{counts.dikonfirmasi}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs">
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">Disiapkan</span>
              <span className="text-xl font-bold text-indigo-800 mt-1 block">{counts.sedang_disiapkan}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Siap Diambil</span>
              <span className="text-xl font-bold text-emerald-800 mt-1 block">{counts.siap_diambil}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">Selesai</span>
              <span className="text-xl font-bold text-stone-700 mt-1 block">{counts.selesai}</span>
            </div>
          </div>

          {/* Pending Alert Banner if any orders need approval */}
          {counts.menunggu_konfirmasi > 0 && (
            <div className="bg-amber-500 text-white p-4 rounded-2xl shadow-md flex items-center justify-between gap-4 animate-slideDown">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">
                    Ada {counts.menunggu_konfirmasi} Pesanan Menunggu Konfirmasi Kasir!
                  </h4>
                  <p className="text-xs text-amber-100">
                    Pelanggan sedang menunggu persetujuan Anda sebelum pesanan dapat disiapkan di bar.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveCategoryTab('menunggu_konfirmasi')}
                className="px-4 py-2 rounded-xl bg-white text-amber-900 font-bold text-xs hover:bg-amber-50 transition shrink-0"
              >
                Lihat Antrean Menunggu &rarr;
              </button>
            </div>
          )}

          {/* Filter Bar & Category Tabs */}
          <div className="bg-white p-4 rounded-2xl border border-[#DED5C8] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan nomor pesanan, nama pelanggan, atau meja..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-[#F5F1E8] border border-[#DED5C8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6F4E37] text-[#282522]"
                />
              </div>

              <button
                onClick={() => fetchOrders()}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F5F1E8] text-[#6F4E37] hover:bg-[#DED5C8] transition flex items-center justify-center gap-1.5 self-end sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Segarkan Antrean</span>
              </button>
            </div>

            {/* Category Tab Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-stone-100 pt-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeCategoryTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveCategoryTab(tab.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-2 ${
                      isActive
                        ? 'bg-[#6F4E37] text-white shadow-sm'
                        : 'bg-[#F5F1E8] text-[#6B645D] hover:bg-[#DED5C8]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : tab.badgeColor
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Orders List / Cards */}
          {isLoading && orders.length === 0 ? (
            <div className="py-20 text-center text-stone-500">
              <div className="w-8 h-8 border-2 border-[#6F4E37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium">Memuat antrean pesanan kasir...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#DED5C8] p-12 text-center shadow-sm">
              <Coffee className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-stone-800">Tidak ada pesanan di kategori ini</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                {activeCategoryTab === 'menunggu_konfirmasi'
                  ? 'Bagus! Seluruh pesanan pelanggan yang masuk telah Anda konfirmasi atau tindak lanjuti.'
                  : 'Belum ada data pesanan yang sesuai dengan filter yang Anda pilih.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredOrders.map((order) => {
                const isProcessing = processingId === order.id;

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-[#DED5C8] shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between"
                  >
                    <div>
                      {/* Order Header: ID, Table, Time, Badge */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#6F4E37]">
                              {order.orderNumber}
                            </span>
                            <span className="text-stone-300">&bull;</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#F5F1E8] text-[#282522]">
                              {order.tableNumber || 'Meja Umum'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-stone-600 font-semibold mt-1">
                            <UserIcon className="w-3.5 h-3.5 text-stone-400" />
                            <span>{order.customerName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-stone-400 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDateTime(order.createdAt)}</span>
                          </div>
                        </div>

                        <div>{renderBadge(order.status)}</div>
                      </div>

                      {/* Notes / Reason Alert */}
                      {order.notes && (
                        <div className="mt-3 p-2.5 rounded-xl bg-[#F5F1E8]/70 border border-[#DED5C8]/50 text-xs text-stone-700">
                          <span className="font-semibold text-stone-900">Catatan Pelanggan:</span>{' '}
                          &ldquo;{order.notes}&rdquo;
                        </div>
                      )}

                      {order.rejectedReason && (
                        <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                          <span className="font-semibold">Alasan Penolakan:</span> {order.rejectedReason}
                        </div>
                      )}

                      {/* Product Items Table */}
                      <div className="mt-3.5 pt-2 border-t border-stone-100">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-stone-400 uppercase text-[10px] font-semibold border-b border-stone-100 pb-1">
                              <th className="pb-1.5">Menu</th>
                              <th className="pb-1.5 text-center">Qty</th>
                              <th className="pb-1.5 text-right">Harga</th>
                              <th className="pb-1.5 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-50">
                            {order.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-stone-50/50">
                                <td className="py-2 text-stone-800 font-medium">
                                  {item.name}
                                </td>
                                <td className="py-2 text-center font-bold text-[#6F4E37]">
                                  {item.quantity}
                                </td>
                                <td className="py-2 text-right text-stone-500">
                                  {formatRupiah(item.price)}
                                </td>
                                <td className="py-2 text-right font-bold text-stone-800">
                                  {formatRupiah(item.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Total & Action Buttons */}
                    <div className="mt-4 pt-3.5 border-t border-stone-100">
                      <div className="flex items-center justify-between mb-3.5">
                        <span className="text-xs text-stone-500">Total Tagihan:</span>
                        <span className="text-base font-bold text-[#6F4E37]">
                          {formatRupiah(order.totalAmount)}
                        </span>
                      </div>

                      {/* Dynamic Action Buttons for Cashier */}
                      <div className="flex items-center gap-2">
                        {/* 1. If Menunggu Konfirmasi */}
                        {order.status === 'menunggu_konfirmasi' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(order.id, 'confirm')}
                              disabled={isProcessing}
                              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Konfirmasi Pesanan</span>
                            </button>

                            <button
                              onClick={() => setRejectingOrder(order)}
                              disabled={isProcessing}
                              className="py-2 px-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-rose-200 disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                          </>
                        )}

                        {/* 2. If Dikonfirmasi */}
                        {order.status === 'dikonfirmasi' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'prepare')}
                            disabled={isProcessing}
                            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
                          >
                            <ChefHat className="w-3.5 h-3.5" />
                            <span>Proses Pesanan (Mulai Racik)</span>
                          </button>
                        )}

                        {/* 3. If Sedang Disiapkan */}
                        {order.status === 'sedang_disiapkan' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'ready')}
                            disabled={isProcessing}
                            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
                          >
                            <BellRing className="w-3.5 h-3.5" />
                            <span>Tandai Siap Diambil</span>
                          </button>
                        )}

                        {/* 4. If Siap Diambil */}
                        {order.status === 'siap_diambil' && (
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'complete')}
                            disabled={isProcessing}
                            className="w-full py-2 px-3 rounded-xl bg-[#6F4E37] hover:bg-[#5C4028] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selesaikan Pesanan (Diserahkan)</span>
                          </button>
                        )}

                        {/* 5. Finished / Cancelled */}
                        {['selesai', 'ditolak', 'dibatalkan'].includes(order.status) && (
                          <div className="w-full text-center py-1.5 rounded-lg bg-stone-100 text-[11px] text-stone-500 font-medium">
                            {order.status === 'selesai' && '✓ Pesanan telah selesai diproses'}
                            {order.status === 'ditolak' && '✕ Pesanan telah ditolak kasir'}
                            {order.status === 'dibatalkan' && '✕ Dibatalkan oleh pelanggan'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reject Order Reason Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900">Tolak Pesanan Pelanggan</h3>
                <p className="text-xs text-stone-500">{rejectingOrder.orderNumber} - {rejectingOrder.customerName}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 mb-4 leading-relaxed">
              Pesanan ini tidak akan diteruskan ke dapur dan tidak akan dihitung sebagai penjualan. Pelanggan akan mendapatkan notifikasi alasan penolakan.
            </p>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-semibold text-stone-700">Pilih atau Ketik Alasan:</label>
              <select
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6F4E37]"
                onChange={(e) => setRejectReason(e.target.value)}
                defaultValue={rejectReason}
              >
                <option value="Bahan baku menu tertentu sedang habis.">Bahan baku menu tertentu sedang habis</option>
                <option value="Kapasitas bar / meja sedang penuh.">Kapasitas bar / meja sedang penuh</option>
                <option value="Toko atau dapur mendekati jam tutup.">Toko atau dapur mendekati jam tutup</option>
                <option value="Informasi meja atau pesanan tidak jelas.">Informasi meja atau pesanan tidak jelas</option>
              </select>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Tulis alasan khusus..."
                className="w-full p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#6F4E37]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectingOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(rejectingOrder.id, 'reject', rejectReason)}
                disabled={processingId === rejectingOrder.id}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition shadow-sm disabled:opacity-50"
              >
                {processingId === rejectingOrder.id ? 'Memproses...' : 'Konfirmasi Penolakan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
