'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 fixed inset-y-0 z-40 border-r bg-white">
          <Sidebar />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
            <aside className="relative w-64 max-w-xs h-full bg-white">
              <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
          <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
