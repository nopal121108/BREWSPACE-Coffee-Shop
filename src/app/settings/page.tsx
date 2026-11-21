'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useToast } from '@/components/Toast';
import { Settings, User } from '@/types';
import { Store, Save, Receipt, Percent } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings>({
    store_name: '',
    store_tagline: '',
    store_address: '',
    store_phone: '',
    store_email: '',
    tax_percentage: '0',
    currency_symbol: 'Rp',
    receipt_footer: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('brewspace_token') : null;
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('/api/auth/me', { headers: authHeaders })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.user) {
          router.push('/');
        } else if (data.user.role !== 'admin') {
          showToast('Akses ditolak: Pengaturan Toko hanya dapat diakses oleh Administrator.', 'error');
          router.push('/pos');
        } else {
          setUser(data.user);
          fetch('/api/settings')
            .then((r) => r.json())
            .then((d) => {
              if (d.success && d.settings) {
                setSettings(d.settings);
              }
            });
        }
      })
      .catch(() => router.push('/'));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Pengaturan toko berhasil diperbarui.', 'success');
      } else {
        showToast(data.error || 'Gagal menyimpan pengaturan.', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-coffee-100">
      <Sidebar user={user} />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Pengaturan Coffee Shop & Format Struk"
          subtitle="Kustomisasi Profil Kedai, Pajak Restoran (PB1), dan Pesan Kaki Struk Thermal"
          user={user}
        />

        <div className="p-8 max-w-3xl">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-8 rounded-3xl border border-coffee-200/80 shadow-sm space-y-6 text-xs"
          >
            {/* Store Profile Section */}
            <div>
              <h3 className="font-bold font-display text-sm text-coffee-800 flex items-center gap-2 mb-1">
                <Store className="w-4 h-4 text-coffee-600" />
                Profil Kedai Kopi
              </h3>
              <p className="text-stone-400 text-[11px] mb-4">
                Informasi ini akan dicetak di bagian paling atas struk thermal kasir.
              </p>

              <div className="space-y-3.5">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Nama Coffee Shop *</label>
                  <input
                    type="text"
                    value={settings.store_name}
                    onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Slogan / Tagline</label>
                  <input
                    type="text"
                    value={settings.store_tagline || ''}
                    onChange={(e) => setSettings({ ...settings, store_tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Alamat Lengkap</label>
                  <textarea
                    value={settings.store_address}
                    onChange={(e) => setSettings({ ...settings, store_address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">No. Telepon / WhatsApp</label>
                    <input
                      type="text"
                      value={settings.store_phone}
                      onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={settings.store_email || ''}
                      onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tax & Financials */}
            <div className="pt-4 border-t border-stone-100">
              <h3 className="font-bold font-display text-sm text-coffee-800 flex items-center gap-2 mb-1">
                <Percent className="w-4 h-4 text-coffee-600" />
                Pajak & Format Finansial
              </h3>
              <p className="text-stone-400 text-[11px] mb-4">
                Pengaturan persentase pajak yang otomatis ditambahkan saat transaksi kasir.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Persentase Pajak Restoran (PB1 %)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={settings.tax_percentage}
                      onChange={(e) => setSettings({ ...settings, tax_percentage: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">
                      %
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    Isi 0 jika harga menu sudah termasuk pajak atau bebas pajak.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Simbol Mata Uang</label>
                  <input
                    type="text"
                    value={settings.currency_symbol}
                    onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="pt-4 border-t border-stone-100">
              <h3 className="font-bold font-display text-sm text-coffee-800 flex items-center gap-2 mb-1">
                <Receipt className="w-4 h-4 text-coffee-600" />
                Pesan Kaki Struk Thermal
              </h3>
              <p className="text-stone-400 text-[11px] mb-4">
                Teks penutup struk belanja untuk ucapan terima kasih dan media sosial kedai.
              </p>

              <div>
                <textarea
                  value={settings.receipt_footer}
                  onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:ring-1 focus:ring-coffee-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="py-2.5 px-6 rounded-xl bg-coffee-600 hover:bg-coffee-700 text-white font-semibold text-xs flex items-center gap-2 transition shadow-md shadow-coffee-600/20 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Seluruh Pengaturan
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

