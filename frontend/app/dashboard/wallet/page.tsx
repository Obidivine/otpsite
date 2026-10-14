// frontend/app/dashboard/wallet/page.tsx
'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';

export default function WalletPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-slate-600 mt-2">
            Placeholder — real wallet page coming in Phase 3F.
          </p>
        </main>
      </div>
    </ProtectedRoute>
  );
}