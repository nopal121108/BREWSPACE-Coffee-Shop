'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Product, Category, User } from '@/types';
import { formatRupiah } from '@/lib/utils';
import { getProductImage } from '@/lib/coffee-images';
import {
  Search,
  Coffee,
  CheckCircle,
  AlertTriangle,
  X,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

export default function ProductsInfoPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [loading, setLoading] = useState(true);

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

    fetch('/api/pos/products', { headers: authHeaders })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setProducts(d.products || []);
          setCategories(d.categories || []);
        }
      })
      .catch((err) => console.error('Failed to load products info:', err))
      .finally(() => setLoading(false));
  }, [router]);

  const stats = useMemo(() => {
    const total = products.length;
    const available = products.filter((p) => p.stock > (p.min_stock || 5)).length;
    const low = products.filter((p) => p.stock > 0 && p.stock <= (p.min_stock || 5)).length;
    const empty = products.filter((p) => p.stock <= 0).length;
    return { total, available, low, empty };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCat !== 'all' && String(p.category_id) !== selectedCat) {
        return false;
      }
      // Status filter
      if (statusFilter === 'in_stock' && p.stock <= (p.min_stock || 5)) return false;
      if (statusFilter === 'low_stock' && (p.stock <= 0 || p.stock > (p.min_stock || 5))) return false;
      if (statusFilter === 'out_of_stock' && p.stock > 0) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchCat = (p.category_name || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        return matchName || matchCat || matchDesc;
      }

      return true;
    });
  }, [products, selectedCat, statusFilter, search]);

  return (
    <div className="flex h-screen overflow-hidden bg-coffee-100">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Informasi Menu & Stok Produk"
          subtitle="Katalog Baca-Saja: Periksa Harga Satuan, Komposisi Menu, dan Ketersediaan Stok Real-Time"
          user={user}
        />

        <div className="p-8 space-y-6">
          {/* Quick Notice Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3.5 shadow-sm">
            <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <h4 className="font-bold text-amber-900">Mode Informasi Kasir (Katalog Baca-Saja)</h4>
              <p className="text-amber-800/90 mt-0.5 leading-relaxed">
                Halaman ini difokuskan untuk memudahkan kasir mengecek harga menu dan ketersediaan stok fisik saat melayani pelanggan.
                Perubahan harga dan penyesuaian stok hanya dapat dilakukan melalui akun Administrator.
              </p>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setStatusFilter('all')}
              className={`p-4 rounded-2xl bg-white border cursor-pointer transition shadow-sm ${
                statusFilter === 'all' ? 'border-coffee-600 ring-2 ring-coffee-600/20' : 'border-coffee-200 hover:border-coffee-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Menu</span>
                <Coffee className="w-4 h-4 text-coffee-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-coffee-900">{stats.total}</span>
                <span className="text-xs text-stone-400">item terdaftar</span>
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('in_stock')}
              className={`p-4 rounded-2xl bg-white border cursor-pointer transition shadow-sm ${
                statusFilter === 'in_stock' ? 'border-emerald-600 ring-2 ring-emerald-600/20' : 'border-emerald-200 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Stok Aman</span>
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-800">{stats.available}</span>
                <span className="text-xs text-emerald-600">siap dipesan</span>
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('low_stock')}
              className={`p-4 rounded-2xl bg-white border cursor-pointer transition shadow-sm ${
                statusFilter === 'low_stock' ? 'border-amber-600 ring-2 ring-amber-600/20' : 'border-amber-200 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Stok Menipis</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-amber-800">{stats.low}</span>
                <span className="text-xs text-amber-600">di bawah batas</span>
              </div>
            </div>

            <div
              onClick={() => setStatusFilter('out_of_stock')}
              className={`p-4 rounded-2xl bg-white border cursor-pointer transition shadow-sm ${
                statusFilter === 'out_of_stock' ? 'border-rose-600 ring-2 ring-rose-600/20' : 'border-rose-200 hover:border-rose-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Stok Habis</span>
                <X className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-rose-800">{stats.empty}</span>
                <span className="text-xs text-rose-600">perlu restock</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-coffee-200/80 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama menu atau rasa..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-coffee-200 bg-coffee-50/50 text-xs focus:ring-2 focus:ring-coffee-600 focus:outline-none transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedCat('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                  selectedCat === 'all'
                    ? 'bg-coffee-600 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Semua Kategori
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(String(c.id))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                    selectedCat === String(c.id)
                      ? 'bg-coffee-600 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          {loading ? (
            <div className="py-20 text-center text-stone-400">
              <div className="w-8 h-8 border-3 border-coffee-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs">Memuat katalog informasi produk...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-stone-300 p-8">
              <Coffee className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-stone-700">Tidak ada produk ditemukan</h3>
              <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                Coba gunakan kata kunci pencarian lain atau pilih filter kategori yang berbeda.
              </p>
              {(search || selectedCat !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedCat('all');
                    setStatusFilter('all');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-coffee-600 text-white text-xs font-semibold hover:bg-coffee-700 transition"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                const isLowStock = !isOutOfStock && p.stock <= (p.min_stock || 5);
                const imgSrc = getProductImage(p.name, p.category_name);

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-coffee-200/80 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden group"
                  >
                    {/* Visual Banner */}
                    <div className="h-36 bg-gradient-to-b from-coffee-50 to-stone-100 p-4 relative flex items-center justify-center border-b border-coffee-100">
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          alt={p.name}
                          className="h-28 w-28 object-contain drop-shadow-md group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <Coffee className="w-16 h-16 text-coffee-300" />
                      )}

                      {/* Category Badge */}
                      <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-coffee-800 border border-coffee-200 backdrop-blur-sm">
                        {p.category_name}
                      </span>

                      {/* Stock Badge */}
                      <span
                        className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOutOfStock
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : isLowStock
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {isOutOfStock ? 'Stok Habis' : isLowStock ? `Sisa ${p.stock}` : `${p.stock} Unit`}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm group-hover:text-coffee-700 transition">
                          {p.name}
                        </h3>
                        <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                          {p.description || 'Menu racikan barista segar khas BREWSPACE.'}
                        </p>
                      </div>

                      <div className="pt-4 mt-3 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-stone-400 block">Harga</span>
                          <span className="text-base font-bold font-mono text-coffee-800">
                            {formatRupiah(p.price)}
                          </span>
                        </div>

                        <button
                          onClick={() => router.push('/pos')}
                          disabled={isOutOfStock}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            isOutOfStock
                              ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                              : 'bg-coffee-600 text-white hover:bg-coffee-700 active:scale-95 shadow-sm'
                          }`}
                          title={isOutOfStock ? 'Produk habis, tidak bisa dipesan' : 'Buka kasir untuk pesanan'}
                        >
                          <span>Pesan POS</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
