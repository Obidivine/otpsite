// frontend/components/ProtectedRoute.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [mounted, setMounted] = useState(false);

  // Flip mounted to true after first client render — matches server HTML
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && hasHydrated && !token) {
      router.replace('/login');
    }
  }, [mounted, hasHydrated, token, router]);

  // On server AND client's first render: show same loading state
  if (!mounted || !hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  // After hydration but no token → redirecting
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}