'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import { Product, Category, User } from '@/types';
import { formatRupiah } from '@/lib/utils';
import { getProductImage } from '@/lib/coffee-images';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, Coffee, X } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: '',
    stock: '',
    min_stock: '5',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  const loadData = () => {
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProducts(d.products || []);
      });

    fetch('/api/pos/products')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.categories || []);
      });
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
          showToast('Akses ditolak: Manajemen Produk hanya dapat diakses oleh Administrator.', 'error');
          router.push('/pos');
        } else {
          setUser(data.user);
          loadData();
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: categories[0]?.id ? String(categories[0].id) : '',
      price: '',
      stock: '20',
      min_stock: '5',
      description: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category_id: String(p.category_id),
      price: String(p.price),
      stock: String(p.stock),
      min_stock: String(p.min_stock),
      description: p.description || '',
      status: p.status,
    });
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (p: Product) => {
    const nextStatus = p.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...p, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Status "${p.name}" diubah ke ${nextStatus === 'active' ? 'Aktif' : 'Nonaktif'}.`, 'success');
        loadData();
      } else {
        showToast(data.error || 'Gagal mengubah status.', 'error');
      }
    } catch {
      showToast('Gagal mengubah status.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category_id || !formData.price) {
      showToast('Harap lengkapi field wajib.', 'error');
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        category_id: parseInt(formData.category_id, 10),
        price: parseInt(formData.price, 10),
        stock: parseInt(formData.stock || '0', 10),
        min_stock: parseInt(formData.min_stock || '5', 10),
        description: formData.description.trim(),
        status: formData.status,
      };

      const url = editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Produk tersimpan.', 'success');
        setIsModalOpen(false);
        loadData();
      } else {
        showToast(data.error || 'Gagal menyimpan.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan.', 'error');
    }
  };

  const filtered = products.filter((p) => {
    const matchesCat = selectedCat === 'all' || String(p.category_id) === selectedCat;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex h-screen overflow-hidden bg-coffee-100">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Manajemen Menu & Produk"
          subtitle="Atur Daftar Menu Kopi, Harga Satuan, Persediaan Awal, dan Status Aktif"
          user={user}
        />

        <div className="p-8 space-y-6">
          {/* Top Bar: Action & Filter */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari menu produk..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-coffee-200 bg-white text-xs focus:ring-2 focus:ring-coffee-600 focus:outline-none"
                />
              </div>

              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-coffee-200 bg-white text-xs font-medium focus:ring-2 focus:ring-coffee-600 focus:outline-none"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={openCreateModal}
              className="py-2.5 px-4 rounded-xl bg-coffee-600 hover:bg-coffee-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Menu Baru
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-coffee-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-coffee-50 border-b border-coffee-200 text-coffee-800 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Menu & Visual</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Harga Satuan</th>
                  <th className="py-3 px-4">Stok</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((p) => {
                  const imgSrc = getProductImage(p.image_url, p.name, p.category_slug);
                  return (
                    <tr key={p.id} className="hover:bg-coffee-50/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={imgSrc}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-coffee-100 border border-coffee-200 shrink-0"
                          />
                          <div>
                            <span className="font-semibold text-stone-900 block">{p.name}</span>
                            <span className="text-[10px] text-stone-400 line-clamp-1">
                              {p.description || '-'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-coffee-100 text-coffee-800">
                          {p.category_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-coffee-800">
                        {formatRupiah(p.price)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono font-bold ${
                            p.stock <= 0
                              ? 'text-rose-600'
                              : p.stock <= p.min_stock
                              ? 'text-amber-600'
                              : 'text-stone-800'
                          }`}
                        >
                          {p.stock} pcs
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {p.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg text-stone-600 hover:bg-coffee-100 transition"
                            title="Edit Produk"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(p)}
                            className={`p-1.5 rounded-lg transition ${
                              p.status === 'active' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-stone-400 hover:bg-stone-100'
                            }`}
                            title="Toggle Status"
                          >
                            {p.status === 'active' ? (
                              <ToggleRight className="w-4 h-4" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 bg-coffee-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm font-display">
                {editingProduct ? 'Edit Menu Produk' : 'Tambah Menu Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-stone-300 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Produk *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Brewspace Aren Latte"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Kategori *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Harga (Rp) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Contoh: 28000"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Batas Minimum Stok</label>
                  <input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Deskripsi Menu</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Catatan cita rasa kopi atau bahan..."
                  rows={2}
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
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

