// frontend/app/dashboard/layout.tsx
'use client';

import { useState, Suspense } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { DashboardFooter } from '@/components/DashboardFooter';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex text-slate-900">
      {/* We wrap the Sidebar in Suspense because it uses usePathname() */}
      <aside className="hidden md:block w-64 fixed inset-y-0 z-40 border-r bg-white">
        <Suspense fallback={<div className="p-4 text-sm text-slate-500">Loading menu...</div>}>
          <Sidebar />
        </Suspense>
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative w-64 max-w-xs h-full bg-white">
            <Suspense fallback={<div className="p-4 text-sm text-slate-500">Loading...</div>}>
              <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
            </Suspense>
          </aside>
        </div>
      )}

      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
  <div className="flex-1">
    {children}
  </div>
  <DashboardFooter /> {/* <-- Add it here */}
</main>
      </div>
    </div>
  );
}