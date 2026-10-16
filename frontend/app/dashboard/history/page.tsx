// frontend/app/dashboard/history/page.tsx
'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { SessionCard } from '@/components/SessionCard';
import { EmptyState } from '@/components/EmptyState';
import { useUserSessions } from '@/lib/queries';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

type Filter = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';

export default function HistoryPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <HistoryContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function HistoryContent() {
  const { data, isLoading } = useUserSessions();
  const [filter, setFilter] = useState<Filter>('ALL');

  const sessions = data?.sessions ?? [];
  const now = Date.now();

  const filtered = sessions.filter((s) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') {
      return s.status === 'ACTIVE' && s.expiresAt > now;
    }
    if (filter === 'EXPIRED') {
      return (
        s.status === 'EXPIRED' ||
        (s.status === 'ACTIVE' && s.expiresAt <= now)
      );
    }
    return s.status === filter;
  });

  const counts = {
    ALL: sessions.length,
    ACTIVE: sessions.filter((s) => s.status === 'ACTIVE' && s.expiresAt > now).length,
    COMPLETED: sessions.filter((s) => s.status === 'COMPLETED').length,
    EXPIRED: sessions.filter(
      (s) =>
        s.status === 'EXPIRED' || (s.status === 'ACTIVE' && s.expiresAt <= now)
    ).length,
  };

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'ALL', label: `All (${counts.ALL})` },
    { id: 'ACTIVE', label: `Active (${counts.ACTIVE})` },
    { id: 'COMPLETED', label: `Completed (${counts.COMPLETED})` },
    { id: 'EXPIRED', label: `Expired (${counts.EXPIRED})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Session History</h1>
        <p className="text-slate-600 mt-1">
          All the phone numbers you've rented.
        </p>
      </div>

      {sessions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No session history yet"
          description="Once you rent a phone number, it will appear here. Every session you've ever made is stored for your records."
          actionLabel="Rent Your First Number"
          actionHref="/dashboard/rent"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No sessions match this filter"
          description="Try a different filter to see your sessions."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}