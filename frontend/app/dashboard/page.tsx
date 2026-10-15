// frontend/app/dashboard/page.tsx
'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';
import { BalanceCard } from '@/components/BalanceCard';
import { SessionCard } from '@/components/SessionCard';
import { useUserSessions } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, History } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';



export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardContent />
        </main>
      </div>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { data, isLoading } = useUserSessions();
  const sessions = data?.sessions ?? [];
 const now = Date.now();
const activeSessions = sessions.filter(
  (s) => s.status === 'ACTIVE' && s.expiresAt > now
);
  const recentSessions = sessions.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link href="/dashboard/rent">
          <Button>
            <Phone className="h-4 w-4 mr-2" />
            Rent a Number
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BalanceCard />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeSessions.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              Numbers currently rented
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sessions.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              All-time rentals
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Active Sessions</h2>
          <Link
            href="/dashboard/history"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            <History className="h-4 w-4" />
            View all
          </Link>
        </div>

        {isLoading ? (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {[1, 2].map((i) => (
      <Skeleton key={i} className="h-32 rounded-xl" />
    ))}
  </div>
) : activeSessions.length === 0 ? (
  <EmptyState
    icon={Phone}
    title="No active sessions"
    description="Rent a phone number to start receiving verification codes. Sessions appear here while they're active."
    actionLabel="Rent Your First Number"
    actionHref="/dashboard/rent"
  />
) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {recentSessions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentSessions
              .filter((s) => s.status !== 'ACTIVE')
              .slice(0, 4)
              .map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}