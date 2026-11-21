'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Coffee,
  Search,
  Sparkles,
  Clock,
  MapPin,
  Phone,
  Instagram,
  X,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Info,
  ShieldCheck,
  Flame,
  Award
} from 'lucide-react';
import { Product, Category } from '@/types';
import { formatRupiah } from '@/lib/utils';
import { getProductImage } from '@/lib/coffee-images';

export default function DigitalMenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeProductModal, setActiveProductModal] = useState<Product | null>(null);

  // Fetch live menu catalog from shared database / API
  const fetchMenu = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/menu', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    // Auto-refresh menu every 10 seconds to sync availability with cashier sales
    const interval = setInterval(fetchMenu, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      const matchesCategory =
        selectedCategory === 'all' || p.category_slug === selectedCategory;

      // Availability filter
      const matchesAvailability =
        availabilityFilter === 'all' || (availabilityFilter === 'available' && p.stock > 0);

      // Search query filter (matches name, description, or category name)
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.category_name && p.category_name.toLowerCase().includes(query));

      return matchesCategory && matchesAvailability && matchesSearch;
    });
  }, [products, selectedCategory, availabilityFilter, searchQuery]);

  // Total stats
  const totalAvailable = useMemo(() => products.filter((p) => p.stock > 0).length, [products]);

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#282522] selection:bg-[#DED5C8] font-sans">
      {/* Top Brand Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DED5C8] shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#6F4E37] flex items-center justify-center text-white shadow-md shadow-[#6F4E37]/20">
              <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-widest text-[#282522] font-display">
                  BREWSPACE
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F1E8] text-[#6F4E37] border border-[#DED5C8]">
                  Digital Menu
                </span>
              </div>
              <p className="text-[11px] text-[#6B645D] font-medium tracking-tight">
                Artisanal Coffee &bull; Bakery &bull; Comfort Space
              </p>
            </div>
          </div>

          {/* Store Info & Staff Portal Link */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-[#6B645D] font-medium px-3 py-1.5 rounded-xl bg-[#F5F1E8] border border-[#DED5C8]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Buka Hari Ini: <strong>07.00 – 22.00 WIB</strong></span>
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-[#6F4E37] hover:text-[#5C4028] px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 border border-[#DED5C8] transition shadow-xs flex items-center gap-1.5"
              title="Akses Staf Kasir / Administrator"
            >
              <span>Login Kasir / POS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Showcase Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#6F4E37] via-[#5C4028] to-[#3B281B] text-white py-12 sm:py-16">
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-end pr-10">
          <Coffee className="w-96 h-96" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white backdrop-blur-sm border border-white/15 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Official Coffee Shop Menu &bull; Update Real-Time</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-display leading-tight">
              Eksplorasi Pilihan Kopi &amp; Sajian Spesial
            </h1>

            <p className="mt-3 text-sm sm:text-base text-stone-200 leading-relaxed font-light">
              Nikmati racikan espresso murni dari biji kopi Nusantara, manual brew single origin pilihan, artisan matcha, cokelat Belgia, hingga pastry hangat yang dipanggang setiap pagi.
            </p>

            {/* Quick Badges */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium text-stone-300">
              <div className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-300" />
                <span>100% Arabika Premium</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-300" />
                <span>Freshly Roasted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>Bahan Organik Berkualitas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Notice / Callout */}
      <div className="bg-[#EBE3D5] border-y border-[#DED5C8] py-3 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs text-[#52453B]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#6F4E37] shrink-0" />
            <span>
              <strong>Buku Menu Digital:</strong> Halaman ini khusus untuk melihat informasi &amp; ketersediaan menu. Silakan langsung memesan dan melakukan pembayaran di meja kasir.
            </span>
          </div>
          <span className="hidden md:inline-block text-[11px] font-semibold text-[#6F4E37] whitespace-nowrap">
            {totalAvailable} dari {products.length} Menu Tersedia
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#DED5C8] shadow-sm mb-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B645D]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kopi, latte, v60, matcha, croissant..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm bg-[#F5F1E8] border border-[#DED5C8] focus:outline-none focus:ring-2 focus:ring-[#6F4E37] text-[#282522] placeholder:text-[#9C948A] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C948A] hover:text-[#282522] text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Availability Switch */}
            <div className="flex items-center gap-2 self-start md:self-auto text-xs">
              <span className="text-[#6B645D] font-medium hidden sm:inline">Ketersediaan:</span>
              <div className="bg-[#F5F1E8] p-1 rounded-xl border border-[#DED5C8] flex items-center gap-1">
                <button
                  onClick={() => setAvailabilityFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    availabilityFilter === 'all'
                      ? 'bg-white text-[#6F4E37] shadow-xs'
                      : 'text-[#6B645D] hover:text-[#282522]'
                  }`}
                >
                  Semua ({products.length})
                </button>
                <button
                  onClick={() => setAvailabilityFilter('available')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                    availabilityFilter === 'available'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-[#6B645D] hover:text-[#282522]'
                  }`}
                >
                  Tersedia ({totalAvailable})
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-t border-stone-100 pt-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#6F4E37] text-white shadow-sm'
                  : 'bg-[#F5F1E8] text-[#6B645D] hover:bg-[#DED5C8]'
              }`}
            >
              Semua Menu
            </button>

            {categories.map((cat) => {
              const count = products.filter((p) => p.category_slug === cat.slug).length;
              const isSelected = selectedCategory === cat.slug;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#6F4E37] text-white shadow-sm'
                      : 'bg-[#F5F1E8] text-[#6B645D] hover:bg-[#DED5C8]'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#DED5C8] text-[#52453B]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Catalog Grid */}
        {isLoading && products.length === 0 ? (
          <div className="py-24 text-center text-[#6B645D]">
            <div className="w-10 h-10 border-2 border-[#6F4E37] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Memuat buku menu digital...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#DED5C8] p-12 text-center shadow-sm">
            <Coffee className="w-12 h-12 text-[#9C948A] mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#282522]">Menu tidak ditemukan</h3>
            <p className="text-xs text-[#6B645D] mt-1 max-w-sm mx-auto">
              Tidak ada menu yang sesuai dengan kata kunci atau filter yang Anda pilih. Coba gunakan kata kunci lain.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const isAvailable = product.stock > 0;

              return (
                <div
                  key={product.id}
                  onClick={() => setActiveProductModal(product)}
                  className={`bg-white rounded-2xl border border-[#DED5C8] shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col cursor-pointer group ${
                    !isAvailable ? 'opacity-75 bg-stone-50/70' : ''
                  }`}
                >
                  {/* Visual Header / Photo */}
                  <div className="relative aspect-[16/10] bg-[#F5F1E8] overflow-hidden">
                    <img
                      src={getProductImage(product.image_url, product.name, product.category_slug)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />

                    {/* Category Pill */}
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-[#6F4E37] backdrop-blur-sm shadow-xs border border-stone-200">
                        {product.category_name}
                      </span>
                    </div>

                    {/* Availability Tag */}
                    <div className="absolute top-3 right-3">
                      {isAvailable ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Tersedia</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                          <AlertCircle className="w-3 h-3" />
                          <span>Habis</span>
                        </span>
                      )}
                    </div>

                    {!isAvailable && (
                      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-stone-900/90 text-white tracking-wider uppercase border border-white/20">
                          Sedang Habis
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Name & Price */}
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="text-base font-bold text-[#282522] group-hover:text-[#6F4E37] transition leading-snug">
                          {product.name}
                        </h3>
                        <span className="text-base font-extrabold text-[#6F4E37] shrink-0 font-mono">
                          {formatRupiah(product.price)}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[#6B645D] leading-relaxed line-clamp-2 mb-3">
                        {product.description || 'Sajian kopi istimewa khas racikan barista BREWSPACE.'}
                      </p>
                    </div>

                    {/* Card Footer Info */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
                      <span className="text-stone-400 font-medium">
                        Status Ketersediaan:
                      </span>
                      {isAvailable ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Tersedia di Bar
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold">
                          Habis Sementara
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How to Order Guide Section */}
        <section className="mt-14 bg-white rounded-2xl p-6 sm:p-8 border border-[#DED5C8] shadow-xs">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[11px] font-bold text-[#6F4E37] uppercase tracking-widest block mb-1">
              Cara Pemesanan di Kedai
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-[#282522]">
              Mudah, Cepat, dan Nyaman
            </h2>
            <p className="text-xs text-[#6B645D] mt-1">
              Sistem kami terhubung langsung antara Buku Menu Digital dan Meja Kasir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4 rounded-xl bg-[#F5F1E8]/60 border border-[#DED5C8]">
              <div className="w-10 h-10 rounded-full bg-[#6F4E37] text-white flex items-center justify-center font-bold text-sm mx-auto mb-3 shadow-sm">
                1
              </div>
              <h4 className="text-sm font-bold text-[#282522] mb-1">Pilih Menu dari Gadget Anda</h4>
              <p className="text-xs text-[#6B645D]">
                Lihat daftar menu, foto, harga, dan ketersediaan stok melalui halaman Digital Menu ini.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F5F1E8]/60 border border-[#DED5C8]">
              <div className="w-10 h-10 rounded-full bg-[#6F4E37] text-white flex items-center justify-center font-bold text-sm mx-auto mb-3 shadow-sm">
                2
              </div>
              <h4 className="text-sm font-bold text-[#282522] mb-1">Pesan di Meja Kasir (POS)</h4>
              <p className="text-xs text-[#6B645D]">
                Sebutkan pilihan Anda kepada kasir kami. Kasir akan memproses pesanan melalui sistem POS secara langsung.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F5F1E8]/60 border border-[#DED5C8]">
              <div className="w-10 h-10 rounded-full bg-[#6F4E37] text-white flex items-center justify-center font-bold text-sm mx-auto mb-3 shadow-sm">
                3
              </div>
              <h4 className="text-sm font-bold text-[#282522] mb-1">Nikmati Kopi Anda</h4>
              <p className="text-xs text-[#6B645D]">
                Pilih metode pembayaran (Tunai, QRIS, atau Kartu). Barista kami akan meracik pesanan segar untuk Anda.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Product Detail Modal */}
      {activeProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 animate-scaleUp">
            {/* Modal Image Header */}
            <div className="relative aspect-[16/10] bg-[#F5F1E8]">
              <img
                src={getProductImage(
                  activeProductModal.image_url,
                  activeProductModal.name,
                  activeProductModal.category_slug
                )}
                alt={activeProductModal.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setActiveProductModal(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center text-sm font-bold transition backdrop-blur-sm"
              >
                ✕
              </button>
              <div className="absolute bottom-4 left-4">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#6F4E37] shadow-sm">
                  {activeProductModal.category_name}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-xl font-bold text-[#282522]">
                  {activeProductModal.name}
                </h3>
                <span className="text-xl font-extrabold text-[#6F4E37] font-mono shrink-0">
                  {formatRupiah(activeProductModal.price)}
                </span>
              </div>

              {/* Availability tag */}
              <div className="mb-4">
                {activeProductModal.stock > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tersedia di Kedai</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Stok Sedang Habis</span>
                  </span>
                )}
              </div>

              <div className="text-xs text-[#52453B] leading-relaxed mb-6 space-y-2">
                <p>{activeProductModal.description || 'Pilihan racikan terbaik dari biji kopi berkualitas tinggi khas BREWSPACE.'}</p>
                <div className="p-3 bg-[#F5F1E8] rounded-xl border border-[#DED5C8] text-[11px] text-[#6F4E37] flex items-center gap-2">
                  <Coffee className="w-4 h-4 shrink-0" />
                  <span>Sajian dapat dinikmati dalam varian Panas (Hot) atau Dingin (Iced). Silakan sebutkan preferensi Anda saat memesan ke kasir.</span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setActiveProductModal(null)}
                className="w-full py-3 rounded-xl bg-[#6F4E37] hover:bg-[#5C4028] text-white font-bold text-xs transition shadow-md shadow-[#6F4E37]/20"
              >
                Tutup Informasi Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-16 bg-[#282522] text-stone-300 py-10 border-t border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-stone-800">
            <div>
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#6F4E37] flex items-center justify-center text-white">
                  <Coffee className="w-4 h-4" />
                </div>
                <span className="text-base font-bold text-white tracking-widest font-display">BREWSPACE</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Coffee Shop Management System &bull; Tempat nongkrong nyaman dengan cita rasa kopi artisanal khas Nusantara.
              </p>
            </div>

            <div className="text-xs space-y-2">
              <h5 className="font-bold text-white uppercase tracking-wider mb-2">Lokasi &amp; Kontak</h5>
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#6F4E37] shrink-0 mt-0.5" />
                <span>Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#6F4E37] shrink-0" />
                <span>+62 812-3456-7890</span>
              </p>
            </div>

            <div className="text-xs space-y-2">
              <h5 className="font-bold text-white uppercase tracking-wider mb-2">Jam Layanan</h5>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6F4E37] shrink-0" />
                <span>Senin – Minggu: 07.00 – 22.00 WIB</span>
              </p>
              <p className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-[#6F4E37] shrink-0" />
                <span>@brewspace.coffee</span>
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-500">
            <p>&copy; {new Date().getFullYear()} BREWSPACE Coffee &amp; Roastery. All rights reserved.</p>
            <p>Digital Menu Version 2.0 &bull; Powered by Next.js POS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

