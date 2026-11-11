'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Coffee, Shield } from 'lucide-react';
import { User } from '@/types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  user?: User | null;
}

export default function Header({ title, subtitle, user }: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-coffee-200/70 px-8 py-4 flex items-center justify-between sticky top-0 z-30 no-print">
      <div>
        <h2 className="text-xl font-bold font-display text-coffee-800 tracking-tight">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Date & Time pill */}
        <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-coffee-50 border border-coffee-200 text-xs text-stone-600 font-medium">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-coffee-600" />
            <span>{todayStr}</span>
          </div>
          <span className="text-stone-300">|</span>
          <div className="flex items-center gap-1.5 text-coffee-700 font-semibold font-mono">
            <Clock className="w-3.5 h-3.5 text-coffee-600" />
            <span>{time || '--:--:--'}</span>
          </div>
        </div>

        {/* Role badge */}
        {user && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-coffee-100 text-coffee-800 border border-coffee-300">
            <Shield className="w-3.5 h-3.5 text-coffee-600" />
            <span className="capitalize">{user.role}</span>
          </div>
        )}
      </div>
    </header>
  );
}

