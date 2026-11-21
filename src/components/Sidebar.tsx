'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Coffee,
  Tags,
  Boxes,
  Receipt,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Sparkles,
  ClipboardCheck
} from 'lucide-react';
import { User } from '@/types';

interface SidebarProps {
  user: User | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('brewspace_token');
      localStorage.removeItem('brewspace_user');
      router.push('/');
    } catch {
      router.push('/');
    }
  };

  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? [
        { href: '/dashboard', label: 'Dashboard & Analytics', icon: LayoutDashboard },
        { href: '/pos', label: 'Kasir (POS)', icon: ShoppingCart },
        { href: '/menu', label: 'Buku Menu Digital', icon: Coffee },
        { href: '/products', label: 'Manajemen Produk', icon: Sparkles },
        { href: '/categories', label: 'Kategori Produk', icon: Tags },
        { href: '/inventory', label: 'Manajemen Stok', icon: Boxes },
        { href: '/transactions', label: 'Riwayat Transaksi', icon: Receipt },
        { href: '/reports', label: 'Laporan Penjualan', icon: BarChart3 },
        { href: '/users', label: 'Manajemen Pengguna', icon: Users },
        { href: '/settings', label: 'Pengaturan Toko', icon: Settings },
      ]
    : [
        { href: '/pos', label: 'Kasir / Transaksi', icon: ShoppingCart },
        { href: '/menu', label: 'Buku Menu Digital', icon: Coffee },
        { href: '/transactions', label: 'Riwayat Transaksi', icon: Receipt },
        { href: '/products-info', label: 'Informasi Produk', icon: Sparkles },
        { href: '/profile', label: 'Profil Pengguna', icon: Users },
      ];

  return (
    <aside className="w-64 bg-coffee-800 text-stone-200 flex flex-col shrink-0 min-h-screen border-r border-coffee-900 select-none no-print">
      {/* Brand Header */}
      <div className="p-6 border-b border-coffee-700/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coffee-400 to-coffee-600 flex items-center justify-center text-white shadow-md">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-white tracking-wider flex items-center gap-1.5">
              BREWSPACE
            </h1>
            <p className="text-[11px] text-coffee-300 font-medium">Coffee & POS System</p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-coffee-400 uppercase">
          {isAdmin ? 'Menu Administrator' : 'Operasional Kasir'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${isActive
                ? 'bg-coffee-600 text-white shadow-sm font-semibold'
                : 'text-stone-300 hover:bg-coffee-700/50 hover:text-white'
                }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-coffee-300'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout Footer */}
      <div className="p-4 border-t border-coffee-700/60 bg-coffee-900/40">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-coffee-600 text-coffee-100 flex items-center justify-center font-bold text-sm shrink-0">
              {(user?.fullName || user?.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">
                {user?.fullName || user?.full_name || 'Pengguna'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                <span className="text-[10px] text-stone-300 font-medium capitalize">
                  {user?.role || 'kasir'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-rose-300 hover:text-white hover:bg-rose-500/20 transition border border-rose-500/30"
        >
          <LogOut className="w-3.5 h-3.5" />
          Keluar Sistem
        </button>
      </div>
    </aside>
  );
}

