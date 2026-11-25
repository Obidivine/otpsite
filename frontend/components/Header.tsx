// frontend/components/Header.tsx
'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { useBalance } from '@/lib/queries';
import { Menu } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SupportLinks } from '@/components/SupportLinks';
import { InstallButton } from '@/components/InstallButton';

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
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
            {/* Left side: Mobile Menu Button & Brand Name */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick} 
          className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        
        {/* Brand Name - Shows on ALL screens now */}
        <div>
          <Link href="/dashboard" className="text-lg md:text-xl font-black text-slate-900 tracking-tight hover:opacity-80 transition-opacity">
            OTP360<span className="text-blue-600">.store</span>
          </Link>
        </div>
      </div>

      {/* Right side: Balance & Profile */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/wallet"
          className="text-sm font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 transition-colors hover:bg-slate-100"
        >
          <span className="hidden sm:inline text-slate-500">Balance:</span>{' '}
          {balanceData ? (
            <span className="text-slate-900 font-bold">{balanceNaira}</span>
          ) : (
            <Skeleton className="h-4 w-12 inline-block" />
          )}
        </Link>
		
		<div className="px-3 py-2">
  <InstallButton />
</div>

        {/* Desktop Avatar */}
        <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden lg:block">
            <p className="text-xs text-slate-500">Logged in as</p>
            <p className="text-sm font-medium truncate max-w-[150px]">{user?.email}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}