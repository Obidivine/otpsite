// frontend/components/Header.tsx
'use client';

import { useAuthStore } from '@/lib/store';
import { useBalance } from '@/lib/queries';
import { Menu } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const token = useAuthStore((s) => s.token);

  const { data: balanceData } = useBalance({
    enabled: hasHydrated && !!token,
  });

  const balanceNaira = balanceData
    ? `₦${(balanceData.balanceCents / 100).toLocaleString('en-NG')}`
    : '₦—';

  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'U';

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6">
      {/* Mobile Menu Button */}
      <div className="flex items-center gap-4 md:hidden">
        <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-bold text-lg">OTP Reseller</span>
      </div>

      {/* Desktop Spacer */}
      <div className="hidden md:block" />

      {/* Right Side: Balance & Avatar */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/wallet"
          className="text-sm font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200"
        >
          <span className="hidden sm:inline text-slate-500">Balance:</span>{' '}
          {balanceData ? (
            <span className="text-slate-900 font-bold">{balanceNaira}</span>
          ) : (
            <Skeleton className="h-4 w-12 inline-block" />
          )}
        </Link>

        {/* Desktop Avatar */}
        <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden lg:block">
            <p className="text-xs text-slate-500">Logged in as</p>
            <p className="text-sm font-medium truncate max-w-[150px]">{user?.email}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}