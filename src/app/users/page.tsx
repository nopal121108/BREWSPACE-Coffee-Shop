'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import { User } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Users, Plus, Edit2, Shield, X } from 'lucide-react';

export default function UsersPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'kasir' as 'admin' | 'kasir',
    status: 'active' as 'active' | 'inactive',
  });

  const loadUsers = () => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setUsers(d.users || []);
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
          showToast('Akses ditolak: Kelola Pengguna hanya dapat diakses oleh Administrator.', 'error');
          router.push('/pos');
        } else {
          setCurrentUser(data.user);
          loadUsers();
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ username: '', fullName: '', password: '', role: 'kasir', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      fullName: u.full_name || u.fullName,
      password: '',
      role: u.role,
      status: u.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser && (!formData.username || !formData.password)) {
      showToast('Username dan password wajib diisi.', 'error');
      return;
    }

    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Data pengguna disimpan.', 'success');
        setIsModalOpen(false);
        loadUsers();
      } else {
        showToast(data.error || 'Gagal menyimpan.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan.', 'error');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-coffee-100">
      <Sidebar user={currentUser} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Manajemen Pengguna & Staf Kasir"
          subtitle="Atur Akun Login Barista Kasir dan Administrator Sistem"
          user={currentUser}
        />

        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-xs text-stone-500">
              Total <strong>{users.length}</strong> Akun Terdaftar
            </p>
            <button
              onClick={openCreateModal}
              className="py-2.5 px-4 rounded-xl bg-coffee-600 hover:bg-coffee-700 text-white font-semibold text-xs flex items-center gap-2 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Tambah Akun Staf Baru
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-coffee-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-coffee-50 border-b border-coffee-200 text-coffee-800 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Nama Lengkap & User</th>
                  <th className="py-3 px-4">Hak Akses (Role)</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4">Terdaftar Sejak</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-coffee-50/40 transition">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-stone-900 block">{u.full_name}</span>
                      <span className="text-[10px] text-stone-400 font-mono">@{u.username}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 ${u.role === 'admin'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-coffee-100 text-coffee-800'
                          }`}
                      >
                        <Shield className="w-3 h-3" />
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                      >
                        {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-500">{formatDateTime(u.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(u)}
                        className="py-1 px-2.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold text-[11px] inline-flex items-center gap-1 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Akun
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-6 py-4 bg-coffee-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm font-display">
                {editingUser ? 'Edit Akun Pengguna' : 'Tambah Akun Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-stone-300 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Contoh: Budi Santoso (Barista)"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser}
                  placeholder="Contoh: barista1"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none disabled:bg-stone-100"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {editingUser ? 'Ubah Password (kosongkan jika tidak diganti)' : 'Password *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimal 5 karakter"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                  required={!editingUser}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none capitalize"
                  >
                    <option value="kasir">Kasir</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Status Akun</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none capitalize"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                  </select>
                </div>
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
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

