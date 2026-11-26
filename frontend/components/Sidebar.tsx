// frontend/components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { 
  Phone, 
  Wallet, 
  History, 
  Receipt, 
  User, 
  Info, 
  MessageCircle, 
  LogOut,
  PlusCircle
} from 'lucide-react';

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Generate initials for the avatar (e.g., "obidivineuseh2@gmail.com" -> "OB")
  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'U';

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: User },
    { name: 'Rent a Number', href: '/dashboard/rent', icon: Phone },
    { name: 'Top Up Wallet', href: '/dashboard/wallet', icon: PlusCircle },
    { name: 'Wallet & Transactions', href: '/dashboard/wallet', icon: Wallet },
    { name: 'Session History', href: '/dashboard/history', icon: History },
  ];

  const bottomItems = [
    { name: 'About Us', href: '/about', icon: Info },
    { name: 'Contact Support', href: 'https://wa.me/2347040763069', icon: MessageCircle, external: true },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* User Profile Section */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
  <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
  <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
          <p className="text-xs text-slate-500">Account</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
  isActive 
    ? 'bg-slate-800 text-white' // Mature active state
    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
}`}
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* Bottom Navigation */}
     <div className="p-4 border-t border-slate-800 space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}