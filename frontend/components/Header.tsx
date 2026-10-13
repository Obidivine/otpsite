// frontend/components/Header.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useBalance } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data: balanceData } = useBalance();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  const balanceUSD = balanceData
    ? `$${(balanceData.balanceCents / 100).toFixed(2)}`
    : '$—';

  return (
    <header className="border-b bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-lg">
              OTP Reseller
            </Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/dashboard/rent" className="text-slate-600 hover:text-slate-900">
                Rent
              </Link>
              <Link href="/dashboard/wallet" className="text-slate-600 hover:text-slate-900">
                Wallet
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/wallet"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Balance: <span className="text-slate-900">{balanceUSD}</span>
            </Link>

            <span className="hidden sm:inline text-sm text-slate-500">
              {user?.email}
            </span>

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}