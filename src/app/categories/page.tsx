'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import { Category, User } from '@/types';
import { Plus, Edit2, Tags, X, CheckCircle } from 'lucide-react';

export default function CategoriesPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' });

  const loadCategories = () => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCategories(d.categories || []);
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

    loadCategories();
  }, [router]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (c: Category) => {
    setEditingCategory(c);
    setFormData({ name: c.name, description: c.description || '', status: c.status });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Nama kategori wajib diisi.', 'error');
      return;
    }

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Kategori tersimpan.', 'success');
        setIsModalOpen(false);
        loadCategories();
      } else {
        showToast(data.error || 'Gagal menyimpan.', 'error');
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
          title="Manajemen Kategori Menu"
          subtitle="Pengelompokan Produk untuk Tampilan Kasir POS dan Laporan Analisis"
          user={user}
        />

        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-xs text-stone-500">
              Total <strong>{categories.length}</strong> Kategori Terdaftar
            </p>
            <button
              onClick={openCreateModal}
              className="py-2.5 px-4 rounded-xl bg-coffee-600 hover:bg-coffee-700 text-white font-semibold text-xs flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Kategori
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((c) => (
              <div
                key={c.id}
                className="bg-white p-5 rounded-2xl border border-coffee-200/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-lg bg-coffee-50 text-coffee-600 flex items-center justify-center">
                      <Tags className="w-4 h-4" />
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-coffee-100 text-coffee-800">
                      {c.product_count || 0} Produk
                    </span>
                  </div>
                  <h4 className="font-bold font-display text-sm text-stone-900">{c.name}</h4>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                    {c.description || 'Tidak ada deskripsi.'}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100 text-xs">
                  <span className="text-[10px] text-stone-400 font-mono">slug: {c.slug}</span>
                  <button
                    onClick={() => openEditModal(c)}
                    className="text-coffee-600 hover:text-coffee-800 font-semibold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-coffee-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm font-display">
                {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-stone-300 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Kategori *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Signature Coffee"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan singkat kelompok menu..."
                  rows={3}
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
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

