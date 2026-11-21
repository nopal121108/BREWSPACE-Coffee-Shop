'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Coffee, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if session is already active on initial load
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          if (data.user.role === 'admin') {
            router.replace('/dashboard');
          } else {
            router.replace('/pos');
          }
        } else {
          setIsCheckingAuth(false);
        }
      })
      .catch(() => {
        setIsCheckingAuth(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Harap masukkan username atau email.');
      return;
    }

    if (!password) {
      setErrorMessage('Harap masukkan kata sandi Anda.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Username atau kata sandi tidak sesuai.');
        showToast(data.error || 'Gagal masuk. Periksa kredensial Anda.', 'error');
        setIsLoading(false);
        return;
      }

      showToast(`Selamat datang kembali, ${data.user.fullName}!`, 'success');

      // Keep localStorage in sync for any components that reference it
      if (typeof window !== 'undefined') {
        localStorage.setItem('brewspace_token', data.token);
        localStorage.setItem('brewspace_user', JSON.stringify(data.user));
      }

      // Redirect based on role
      if (data.user.role === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/pos');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage('Terjadi kendala jaringan saat menghubungi server.');
      showToast('Terjadi kesalahan koneksi server.', 'error');
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#6F4E37] flex items-center justify-center text-white shadow-lg mb-4 animate-pulse">
          <Coffee className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6B645D] font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-[#6F4E37]" />
          <span>Memeriksa sesi login...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[#DED5C8] selection:text-[#282522]">
      <div className="w-full max-w-[420px]">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-[#6F4E37]/5 border border-[#DED5C8]/70 overflow-hidden">
          {/* Brand Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-[#F5F1E8]">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-[#6F4E37] items-center justify-center text-white shadow-md shadow-[#6F4E37]/20 mb-3.5">
              <Coffee className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold font-display tracking-wider text-[#282522]">
              BREWSPACE
            </h1>
            <p className="text-xs text-[#6B645D] font-medium mt-1">
              Coffee Shop Management System
            </p>
          </div>

          {/* Form Section */}
          <div className="p-8">
            {/* Error Banner */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5 animate-fadeIn"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span className="flex-1 leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-[#282522] uppercase tracking-wider mb-1.5">
                  Username / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B645D]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Masukkan username atau email"
                    autoComplete="username"
                    autoFocus
                    disabled={isLoading}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DED5C8] bg-white text-sm text-[#282522] placeholder:text-[#9C948A] focus:outline-none focus:ring-2 focus:ring-[#6F4E37] focus:border-transparent transition disabled:bg-stone-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>
              </div>

              {/* Password Input with Show/Hide Toggle */}
              <div>
                <label className="block text-xs font-semibold text-[#282522] uppercase tracking-wider mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#6B645D]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading}
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-[#DED5C8] bg-white text-sm text-[#282522] placeholder:text-[#9C948A] focus:outline-none focus:ring-2 focus:ring-[#6F4E37] focus:border-transparent transition disabled:bg-stone-50 disabled:cursor-not-allowed"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6B645D] hover:text-[#282522] transition focus:outline-none"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#6F4E37] hover:bg-[#5C4028] active:bg-[#4E3521] text-white font-medium text-sm flex items-center justify-center gap-2 transition shadow-md shadow-[#6F4E37]/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Sistem</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Customer Digital Menu Link Banner */}
            <div className="mt-5 pt-4 border-t border-[#F5F1E8] text-center">
              <p className="text-xs text-[#6B645D] mb-2 font-medium">
                Pelanggan Coffee Shop?
              </p>
              <Link
                href="/menu"
                className="w-full py-2.5 px-3 rounded-xl bg-[#F5F1E8] hover:bg-[#DED5C8] text-[#6F4E37] font-semibold text-xs flex items-center justify-center gap-2 transition border border-[#DED5C8]"
              >
                <Coffee className="w-4 h-4" />
                <span>Lihat Buku Menu Digital (Digital Menu) &rarr;</span>
              </Link>
            </div>
          </div>

          {/* Footer Info */}
          <div className="py-4 px-8 bg-[#F5F1E8]/50 border-t border-[#F5F1E8] text-center">
            <p className="text-[11px] text-[#6B645D]">
              BREWSPACE Coffee &bull; POS &amp; Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
