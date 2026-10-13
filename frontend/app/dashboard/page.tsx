// frontend/app/dashboard/page.tsx
'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-slate-600 mt-2">
            Placeholder — full dashboard coming in Phase 3C.
          </p>
        </main>
      </div>
    </ProtectedRoute>
  );
}