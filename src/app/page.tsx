'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, Lock, User, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          if (data.user.role === 'admin') router.push('/dashboard');
          else router.push('/pos');
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      showToast('Harap isi username dan password.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.error || 'Login gagal.', 'error');
        setIsLoading(false);
        return;
      }

      showToast(`Selamat datang kembali, ${data.user.fullName}!`, 'success');
      localStorage.setItem('brewspace_token', data.token);
      localStorage.setItem('brewspace_user', JSON.stringify(data.user));

      if (data.user.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/pos');
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan jaringan.', 'error');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-coffee-100 via-coffee-50 to-coffee-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-coffee-200/60 overflow-hidden">
        {/* Top Header Card */}
        <div className="bg-coffee-800 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-coffee-600/30 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-coffee-400/20 rounded-full blur-xl"></div>

          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-coffee-600 to-coffee-400 shadow-inner mb-3">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-display tracking-wider">BREWSPACE</h1>
          <p className="text-xs text-coffee-300 mt-1 font-medium">
            Modern Coffee Shop Management System
          </p>
        </div>

        {/* Form Container */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin / kasir"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-coffee-600 focus:border-transparent text-sm transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-coffee-600 focus:border-transparent text-sm transition"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-coffee-600 hover:bg-coffee-700 active:bg-coffee-800 text-white font-medium text-sm flex items-center justify-center gap-2 transition shadow-md shadow-coffee-600/20 disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-6 border-t border-stone-200">
            <p className="text-[11px] text-stone-500 font-medium text-center mb-3">
              ⚡ Akun Akses Demo (Klik untuk isi cepat):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className="py-2 px-3 rounded-lg border border-coffee-200 bg-coffee-50/70 hover:bg-coffee-100 text-xs font-medium text-coffee-800 transition text-left flex items-center gap-2"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <div>
                  <div className="font-semibold">Admin</div>
                  <div className="text-[10px] text-stone-500">admin / admin123</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('kasir', 'kasir123')}
                className="py-2 px-3 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-xs font-medium text-emerald-900 transition text-left flex items-center gap-2"
              >
                <Coffee className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-semibold">Kasir (POS)</div>
                  <div className="text-[10px] text-stone-500">kasir / kasir123</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 text-center text-[11px] text-stone-400">
          Powered by Next.js & Native SQLite Engine
        </div>
      </div>
    </div>
  );
}

