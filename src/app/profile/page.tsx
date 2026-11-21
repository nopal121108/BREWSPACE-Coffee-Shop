'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import { User, Transaction } from '@/types';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import {
  User as UserIcon,
  Shield,
  Clock,
  Calendar,
  LogOut,
  Coffee,
  Receipt,
  CheckCircle,
  Store,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

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
        }
      })
      .catch(() => router.push('/'));

    // Fetch cashier's transactions
    fetch('/api/pos/transactions', { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTransactions(data.transactions || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('brewspace_token');
      localStorage.removeItem('brewspace_user');
      showToast('Anda telah berhasil keluar dari sistem.', 'success');
      router.push('/');
    } catch {
      router.push('/');
    }
  };

  const isAdmin = user?.role === 'admin';
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter((t) => t.created_at && t.created_at.startsWith(todayStr));

  return (
    <div className="flex h-screen overflow-hidden bg-coffee-100">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Profil Pengguna & Shift"
          subtitle="Informasi Akun Staf, Status Operasional Shift, dan Pengaturan Sesi"
          user={user}
        />

        <div className="p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Main User Card */}
          <div className="bg-white rounded-3xl border border-coffee-200/80 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-coffee-700 to-coffee-500 text-white flex items-center justify-center font-bold text-3xl shadow-lg shadow-coffee-700/20 shrink-0">
              {(user?.fullName || user?.full_name || 'U').charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div>
                  <h2 className="text-2xl font-bold font-display text-coffee-900">
                    {user?.fullName || user?.full_name || 'Nama Pengguna'}
                  </h2>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">
                    @{user?.username || 'user'} • ID #{user?.id || 1}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize self-center sm:self-auto bg-coffee-100 text-coffee-800 border border-coffee-300">
                  <Shield className="w-3.5 h-3.5 text-coffee-600" />
                  <span>{isAdmin ? 'Administrator' : 'Kasir / Staff POS'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-stone-100">
                <div className="bg-coffee-50/60 p-3 rounded-2xl border border-coffee-200/60">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Status Sesi</span>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold text-xs text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Aktif & Terotentikasi</span>
                  </div>
                </div>

                <div className="bg-coffee-50/60 p-3 rounded-2xl border border-coffee-200/60">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Hak Akses</span>
                  <p className="mt-1 font-semibold text-xs text-coffee-800">
                    {isAdmin ? 'Akses Penuh Semua Modul' : 'Akses Transaksi & Struk Kasir'}
                  </p>
                </div>

                <div className="bg-coffee-50/60 p-3 rounded-2xl border border-coffee-200/60">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Sistem Toko</span>
                  <p className="mt-1 font-semibold text-xs text-coffee-800">
                    BREWSPACE Coffee v2.0
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Shift & Performance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cashier Activity Today */}
            <div className="bg-white rounded-3xl border border-coffee-200/80 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-coffee-100 text-coffee-700">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-coffee-900">Aktivitas Transaksi Shift Anda</h3>
                      <p className="text-[11px] text-stone-400">Ringkasan transaksi yang ditangani kasir ini</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-coffee-700 bg-coffee-50 px-2.5 py-1 rounded-full border border-coffee-200">
                    Hari Ini
                  </span>
                </div>

                <div className="my-6 space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                    <span className="text-xs text-stone-600 font-medium">Transaksi Selesai Hari Ini</span>
                    <span className="text-lg font-bold font-mono text-coffee-900">
                      {todayTransactions.length} pesanan
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70">
                    <span className="text-xs text-stone-600 font-medium">Total Seluruh Transaksi Tercatat</span>
                    <span className="text-lg font-bold font-mono text-stone-700">
                      {transactions.length} pesanan
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100 flex gap-2">
                <button
                  onClick={() => router.push('/pos')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-coffee-600 hover:bg-coffee-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <Coffee className="w-4 h-4" />
                  <span>Buka Halaman Kasir (POS)</span>
                </button>
                <button
                  onClick={() => router.push('/transactions')}
                  className="py-2.5 px-4 rounded-xl border border-coffee-300 hover:bg-coffee-50 text-coffee-800 font-semibold text-xs transition"
                >
                  <span>Riwayat Transaksi</span>
                </button>
              </div>
            </div>

            {/* Role Permissions & Security Overview */}
            <div className="bg-white rounded-3xl border border-coffee-200/80 shadow-sm p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 pb-4 border-b border-stone-100">
                  <div className="p-2 rounded-xl bg-coffee-100 text-coffee-700">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-coffee-900">Ketentuan & Batasan Hak Akses</h3>
                    <p className="text-[11px] text-stone-400">Kebijakan operasional kasir coffee shop</p>
                  </div>
                </div>

                <div className="my-5 space-y-2.5">
                  <div className="flex items-start gap-2.5 text-xs text-stone-600">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Dapat memproses checkout belanja tunai dan non-tunai (QRIS / Transfer).</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-stone-600">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Dapat melihat dan mencetak struk transaksi kasir bersangkutan.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-stone-600">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Dapat mengecek katalog informasi produk dan ketersediaan stok fisik.</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50/70 p-2 rounded-xl border border-amber-200/60">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>Tidak berhak mengubah harga produk, mengoreksi stok manual, atau mengakses laporan omzet pendapatan toko.</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-100">
                <button
                  onClick={() => setLogoutModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-semibold text-xs flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Akhiri Shift & Keluar (Logout)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-coffee-200 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-stone-900">Konfirmasi Keluar Sistem</h3>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin mengakhiri shift dan keluar dari akun kasir ini?
            </p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setLogoutModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 transition shadow-sm"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
